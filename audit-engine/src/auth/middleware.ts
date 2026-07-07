import { AuthService, TokenPayload } from './jwt.js';
import http from 'node:http';

export interface AuthenticatedRequest extends http.IncomingMessage {
  user?: TokenPayload;
}

export function authenticateToken(req: AuthenticatedRequest, res: http.ServerResponse, next: () => void) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Access token required' }));
    return;
  }

  try {
    const user = AuthService.verifyAccessToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid or expired token' }));
  }
}

export function requireRole(...allowedRoles: ('admin' | 'auditor' | 'viewer')[]) {
  return (req: AuthenticatedRequest, res: http.ServerResponse, next: () => void) => {
    if (!req.user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Insufficient permissions' }));
      return;
    }

    next();
  };
}

// Sync versions for use in async handlers
export function authenticateTokenSync(req: AuthenticatedRequest, res: http.ServerResponse): boolean {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Access token required' }));
    return true; // Error occurred
  }

  try {
    const user = AuthService.verifyAccessToken(token);
    req.user = user;
    return false; // No error
  } catch (error) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid or expired token' }));
    return true; // Error occurred
  }
}

export function requireRoleSync(req: AuthenticatedRequest, res: http.ServerResponse, ...allowedRoles: ('admin' | 'auditor' | 'viewer')[]): boolean {
  if (!req.user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Authentication required' }));
    return true; // Error occurred
  }

  if (!allowedRoles.includes(req.user.role)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Insufficient permissions' }));
    return true; // Error occurred
  }

  return false; // No error
}
