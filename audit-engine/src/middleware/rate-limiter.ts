import http from 'node:http';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = options;
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  private getClientIdentifier(req: http.IncomingMessage): string {
    // Use IP address as identifier
    const ip = req.socket.remoteAddress || 'unknown';
    return ip;
  }

  public checkLimit(req: http.IncomingMessage): { allowed: boolean; remaining: number; resetTime: number } {
    const clientId = this.getClientIdentifier(req);
    const now = Date.now();
    const entry = this.store.get(clientId);

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.options.windowMs,
      };
      this.store.set(clientId, newEntry);
      return {
        allowed: true,
        remaining: this.options.maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }

    // Increment count
    entry.count++;

    if (entry.count > this.options.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    return {
      allowed: true,
      remaining: this.options.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  public middleware(req: http.IncomingMessage, res: http.ServerResponse, next: () => void) {
    const result = this.checkLimit(req);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', this.options.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      res.writeHead(429, { 
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
      });
      res.end(JSON.stringify({ 
        error: 'Too many requests',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }));
      return;
    }

    next();
  }
}

// Pre-configured rate limiters for different endpoints
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
});

export const strictRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute (for expensive operations)
});
