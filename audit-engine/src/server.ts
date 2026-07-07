import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WorkerPool } from './workers/worker-pool.js';
import { AuthService } from './auth/jwt.js';
import { authenticateToken, requireRole, authenticateTokenSync, requireRoleSync, AuthenticatedRequest } from './auth/middleware.js';
import { loginSchema, refreshTokenSchema, ingestSchema, validateSchema } from './validation/schemas.js';
import { authRateLimiter, apiRateLimiter, strictRateLimiter } from './middleware/rate-limiter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = Number(process.env.AUDIT_PORT ?? 3456);

// Initialize worker pool
const workerPool = new WorkerPool();

function defaultBaseline(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function parseMultipart(buf: Buffer, boundary: string) {
  const parts = buf.toString('binary').split(`--${boundary}`);
  for (const part of parts) {
    if (!part.includes('filename=')) continue;
    const nameMatch = part.match(/filename="([^"]+)"/);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (!nameMatch || headerEnd < 0) continue;
    const filename = nameMatch[1];
    const body = part.slice(headerEnd + 4);
    const end = body.lastIndexOf('\r\n');
    const content = Buffer.from(body.slice(0, end > 0 ? end : body.length), 'binary');
    return { filename, content };
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, port: PORT }));
    return;
  }

  // Login endpoint
  if (req.url === '/api/auth/login' && req.method === 'POST') {
    // Apply strict rate limiting for auth endpoints
    const rateLimitResult = authRateLimiter.checkLimit(req);
    res.setHeader('X-RateLimit-Limit', '5');
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());

    if (!rateLimitResult.allowed) {
      res.writeHead(429, { 
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
      });
      res.end(JSON.stringify({ 
        error: 'Too many requests',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      }));
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const buf = Buffer.concat(chunks);
    
    try {
      const body = JSON.parse(buf.toString());
      const validation = validateSchema(loginSchema, body);
      
      if (!validation.success) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: validation.error }));
        return;
      }
      
      const { email, password } = validation.data;
      
      // TODO: Replace with actual user lookup from database
      // For now, using a simple demo user
      if (email === 'admin@mirabaud.com' && password === 'admin123') {
        const tokens = AuthService.generateTokens({
          userId: '1',
          email,
          role: 'admin',
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(tokens));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid credentials' }));
      }
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    }
    return;
  }

  // Refresh token endpoint
  if (req.url === '/api/auth/refresh' && req.method === 'POST') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const buf = Buffer.concat(chunks);
    
    try {
      const body = JSON.parse(buf.toString());
      const validation = validateSchema(refreshTokenSchema, body);
      
      if (!validation.success) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: validation.error }));
        return;
      }
      
      const tokens = AuthService.refreshTokens(validation.data.refreshToken);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(tokens));
    } catch (err) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid refresh token' }));
    }
    return;
  }

  if (req.url === '/api/ingest' && req.method === 'POST') {
    // Apply strict rate limiting for expensive operations
    const rateLimitResult = strictRateLimiter.checkLimit(req);
    res.setHeader('X-RateLimit-Limit', '10');
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());

    if (!rateLimitResult.allowed) {
      res.writeHead(429, { 
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
      });
      res.end(JSON.stringify({ 
        error: 'Too many requests',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      }));
      return;
    }

    // Apply authentication middleware
    const authError = authenticateTokenSync(req as AuthenticatedRequest, res);
    if (authError) return;

    // Apply RBAC - only admin and auditor can ingest
    const rbacError = requireRoleSync(req as AuthenticatedRequest, res, 'admin', 'auditor');
    if (rbacError) return;

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const buf = Buffer.concat(chunks);
    const ct = req.headers['content-type'] ?? '';
    const boundaryMatch = ct.match(/boundary=(.+)/);

    // Validate mes parameter
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    const mes = url.searchParams.get('mes') ?? '2026-04';
    const mesValidation = validateSchema(ingestSchema, { mes });
    if (!mesValidation.success) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: mesValidation.error }));
      return;
    }

    if (!boundaryMatch) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'multipart/form-data required' }));
      return;
    }

    const parsed = await parseMultipart(buf, boundaryMatch[1]);
    if (!parsed) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'arquivo nao encontrado no upload' }));
      return;
    }

    const baseline = defaultBaseline(mes);
    const tmpPath = path.join(ROOT, 'audits', mes, 'input', `upload_${Date.now()}_${parsed.filename}`);
    await fs.mkdir(path.dirname(tmpPath), { recursive: true });
    await fs.writeFile(tmpPath, parsed.content);

    // Process file in worker thread to avoid blocking
    workerPool.runTask(
      {
        filePath: tmpPath,
        mes,
        baseline,
        filename: parsed.filename,
        root: ROOT,
      },
      (result) => {
        if (result.ok) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            totals: result.totals,
            carteiras: result.carteiras,
            mes: result.mes,
          }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: result.error }));
        }
      }
    );
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => {
  console.log(`Audit server em http://localhost:${PORT}`);
  console.log(`POST /api/ingest?mes=2026-04`);
});