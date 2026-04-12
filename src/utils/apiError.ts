import type { IFieldError } from '@app-types/index';

// ── Base API Error ─────────────────────────────────────────────────────────
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors: IFieldError[];

  constructor(
    statusCode: number,
    message: string,
    errors: IFieldError[] = [],
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── 400 Bad Request ───────────────────────────────────────────────────────
export class BadRequestError extends ApiError {
  constructor(message = 'Bad request', errors: IFieldError[] = []) {
    super(400, message, errors);
  }
}

// ── 401 Unauthorized ─────────────────────────────────────────────────────
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized. Please log in.') {
    super(401, message);
  }
}

// ── 403 Forbidden ─────────────────────────────────────────────────────────
export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden. Insufficient permissions.') {
    super(403, message);
  }
}

// ── 404 Not Found ─────────────────────────────────────────────────────────
export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

// ── 409 Conflict ──────────────────────────────────────────────────────────
export class ConflictError extends ApiError {
  constructor(message = 'Resource already exists') {
    super(409, message);
  }
}

// ── 422 Unprocessable Entity ─────────────────────────────────────────────
export class UnprocessableError extends ApiError {
  constructor(message = 'Unprocessable entity', errors: IFieldError[] = []) {
    super(422, message, errors);
  }
}

// ── 429 Too Many Requests ─────────────────────────────────────────────────
export class TooManyRequestsError extends ApiError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(429, message);
  }
}

// ── 500 Internal Server Error ─────────────────────────────────────────────
export class InternalError extends ApiError {
  constructor(message = 'Internal server error') {
    super(500, message, [], false);
  }
}
