import crypto from 'crypto';

import { env } from '@config/env';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import type { IJwtPayload } from '@app-types/index';

// ── Access Token ───────────────────────────────────────────────────────────

export function generateAccessToken(payload: Omit<IJwtPayload, 'jti'>): string {
  const jti = uuidv4();
  return jwt.sign({ ...payload, jti }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): IJwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as IJwtPayload;
}

// ── Refresh Token ──────────────────────────────────────────────────────────

export function generateRefreshToken(payload: Omit<IJwtPayload, 'jti'>): string {
  const jti = uuidv4();
  return jwt.sign({ ...payload, jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  } as jwt.SignOptions);
}

export function generateRefreshTokenRememberMe(payload: Omit<IJwtPayload, 'jti'>): string {
  const jti = uuidv4();
  return jwt.sign({ ...payload, jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY_REMEMBER_ME,
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): IJwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as IJwtPayload;
}

// ── Crypto Helpers ─────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random token (raw hex string)
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a token for safe storage in DB (SHA-256)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Compare a raw token against its stored hash
 */
export function compareToken(rawToken: string, hashedToken: string): boolean {
  const hashed = hashToken(rawToken);
  return crypto.timingSafeEqual(Buffer.from(hashed), Buffer.from(hashedToken));
}

/**
 * Calculate token expiry date from a duration string
 */
export function getExpiryDate(duration: string): Date {
  const now = Date.now();
  const units: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const match = /^(\d+)([smhd])$/.exec(duration);
  if (match === null) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const [, amount, unit] = match;
  const multiplier = units[unit ?? ''] ?? 0;
  return new Date(now + parseInt(amount ?? '0', 10) * multiplier);
}

/**
 * Generate a short numeric OTP (for email verification codes if needed)
 */
export function generateOtp(length = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

/**
 * Extract JTI from a JWT without full verification (for blacklisting)
 */
export function extractJti(token: string): string | null {
  try {
    const decoded = jwt.decode(token) as IJwtPayload | null;
    return decoded?.jti ?? null;
  } catch {
    return null;
  }
}

/**
 * Get remaining TTL in seconds for a JWT
 */
export function getTokenTtl(token: string): number {
  try {
    const decoded = jwt.decode(token) as IJwtPayload | null;
    if (decoded?.exp === undefined) return 0;
    const remaining = decoded.exp - Math.floor(Date.now() / 1000);
    return Math.max(0, remaining);
  } catch {
    return 0;
  }
}
