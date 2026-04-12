/* eslint-disable complexity */
import { env } from '@config/env';
import { logger } from '@config/logger';
import { Prisma } from '@prisma/client';
import { ApiError } from '@utils/apiError';
import { sendError } from '@utils/apiResponse';
import jwt from 'jsonwebtoken';

import type { NextFunction, Request, Response } from 'express';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  logger.error({
    message: err instanceof Error ? err.message : 'Unknown error',
    stack: err instanceof Error ? err.stack : undefined,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  // ── Operational API Errors (our custom errors) ─────────────────────────
  if (err instanceof ApiError) {
    sendError(res, err.message, err.statusCode, err.errors);
    return;
  }

  // ── JWT Errors ─────────────────────────────────────────────────────────
  if (err instanceof jwt.TokenExpiredError) {
    sendError(res, 'Token has expired', 401);
    return;
  }

  if (err instanceof jwt.JsonWebTokenError) {
    sendError(res, 'Invalid token', 401);
    return;
  }

  // ── Prisma Errors ──────────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        sendError(res, 'A record with this information already exists', 409);
        return;
      case 'P2025':
        // Record not found
        sendError(res, 'Record not found', 404);
        return;
      case 'P2003':
        // Foreign key constraint
        sendError(res, 'Related record not found', 400);
        return;
      default:
        sendError(res, 'Database operation failed', 500);
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    sendError(res, 'Invalid data provided', 400);
    return;
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    sendError(res, 'Database connection failed', 503);
    return;
  }

  // ── SyntaxError (malformed JSON body) ─────────────────────────────────
  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    sendError(res, 'Invalid JSON in request body', 400);
    return;
  }

  // ── Unknown errors ─────────────────────────────────────────────────────
  let message = 'An unexpected error occurred';
  if (env.NODE_ENV === 'production') {
    message = 'Something went wrong. Please try again later.';
  } else if (err instanceof Error) {
    message = err.message;
  }

  sendError(res, message, 500);
}

// ── 404 handler ────────────────────────────────────────────────────────────
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
}
