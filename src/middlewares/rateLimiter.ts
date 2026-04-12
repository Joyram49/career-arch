import { sendError } from '@utils/apiResponse';
import { HTTP_STATUS, RATE_LIMIT } from '@utils/constants';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import type { Request, Response } from 'express';

// ── Generic handler for all rate limit responses ───────────────────────────
const rateLimitHandler = (_req: Request, res: Response): void => {
  sendError(
    res,
    'Too many requests. Please slow down and try again later.',
    HTTP_STATUS.TOO_MANY_REQUESTS,
  );
};
const skipRateLimitInTests = (): boolean => process.env['NODE_ENV'] === 'test';

// ── General API rate limiter ───────────────────────────────────────────────
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_GENERAL,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req: Request): string =>
    ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? 'unknown'),
  skip: skipRateLimitInTests,
});

// ── Login rate limiter (strict — 5 per 15 min) ────────────────────────────
export const loginLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_LOGIN,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req: Request, res: Response): void => {
    sendError(
      res,
      'Too many login attempts. Account temporarily locked. Please try again in 15 minutes.',
      HTTP_STATUS.TOO_MANY_REQUESTS,
    );
  },
  keyGenerator: (req: Request): string => {
    // Rate limit per IP + email combo for better security
    const email = (req.body as { email?: string }).email ?? '';
    const ip = ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? 'unknown');
    return `${ip}:${email}`;
  },
  skip: skipRateLimitInTests,
});

// ── Registration rate limiter ─────────────────────────────────────────────
export const registerLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_REGISTER,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req: Request): string =>
    ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? 'unknown'),
  skip: skipRateLimitInTests,
});

// ── Forgot password limiter (very strict — prevents email flooding) ────────
export const forgotPasswordLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_FORGOT_PASSWORD,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req: Request): string =>
    ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? 'unknown'),
  skip: skipRateLimitInTests,
});
