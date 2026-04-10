import { redis, RedisKeys } from '@config/redis';
import { sendError } from '@utils/apiResponse';
import { COOKIE_NAMES } from '@utils/constants';
import { verifyAccessToken } from '@utils/token';
import jwt from 'jsonwebtoken';

import type { IJwtPayload } from '@app-types/index';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Verifies access token from Authorization header or HttpOnly cookie.
 * Attaches decoded payload to req.user
 */
export const authenticate: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // 1. Extract token from header or cookie
    const token = extractToken(req);

    if (token === null || token.length === 0) {
      sendError(res, 'Access token is missing', 401);
      return;
    }

    // 2. Verify JWT signature and expiry
    let decoded: IJwtPayload;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        sendError(res, 'Access token has expired', 401);
        return;
      }
      if (err instanceof jwt.JsonWebTokenError) {
        sendError(res, 'Invalid access token', 401);
        return;
      }
      throw err;
    }

    // 3. Check if token JTI is blacklisted (logged out)
    const jti = extractJtiFromPayload(decoded);
    if (jti === null) {
      sendError(res, 'Invalid access token', 401);
      return;
    }
    const blacklisted = await redis.get(RedisKeys.blacklistToken(jti));
    if (blacklisted !== null) {
      sendError(res, 'Token has been revoked. Please log in again.', 401);
      return;
    }

    // 4. Attach payload to request
    attachUserToRequest(req, decoded);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication — attaches user if token present, otherwise continues
 */
export const optionalAuthenticate: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractToken(req);
    if (token === null || token.length === 0) {
      next();
      return;
    }

    const decoded = verifyAccessToken(token);
    const jti = extractJtiFromPayload(decoded);
    if (jti === null) {
      next();
      return;
    }
    const blacklisted = await redis.get(RedisKeys.blacklistToken(jti));
    if (blacklisted === null) {
      attachUserToRequest(req, decoded);
    }
  } catch {
    // Silently ignore auth errors for optional routes
  }
  next();
};

function extractToken(req: Request): string | null {
  // Priority 1: Authorization header
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Priority 2: HttpOnly cookie
  const cookieToken = req.cookies[COOKIE_NAMES.ACCESS_TOKEN] as string | undefined;
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }

  return null;
}

function extractJtiFromPayload(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null || !('jti' in payload)) {
    return null;
  }

  const maybePayload = payload as { jti?: unknown };
  return typeof maybePayload.jti === 'string' && maybePayload.jti.length > 0
    ? maybePayload.jti
    : null;
}

function attachUserToRequest(req: Request, payload: IJwtPayload): void {
  Object.defineProperty(req, 'user', {
    value: payload,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}
