import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../lib/redis';

function makeRedisStore(prefix: string) {
  if (!process.env.REDIS_URL) return undefined;
  return new RedisStore({
    // @ts-expect-error — sendCommand type mismatch between ioredis and rate-limit-redis
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix,
  });
}

// Auth routes: 10 requests per 1 minute per IP
export const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:auth:'),
  message: { error: 'Too many attempts. Try again in a minute.' },
});

// Chat route: 60 requests per minute per user (≈ 1 per 1s)
export const chatLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  keyGenerator: (req: any) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:chat:'),
  message: { error: 'Sending too fast. Please slow down.' },
});

// Hint route: 5 attempts per 10 minutes per user
export const hintLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 5,
  keyGenerator: (req: any) => `hint:${req.user?.id}:${req.params.id}`,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:hint:'),
  message: { error: 'Too many hint attempts. Try again in 10 minutes.' },
});

// Global API limiter
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:global:'),
});

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('[Error]', err?.message || err);
  // Never leak stack traces or internal details in production
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
