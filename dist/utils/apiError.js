"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalError = exports.TooManyRequestsError = exports.UnprocessableError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.ApiError = void 0;
class ApiError extends Error {
    statusCode;
    isOperational;
    errors;
    constructor(statusCode, message, errors = [], isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.errors = errors;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
class BadRequestError extends ApiError {
    constructor(message = 'Bad request', errors = []) {
        super(400, message, errors);
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized. Please log in.') {
        super(401, message);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends ApiError {
    constructor(message = 'Forbidden. Insufficient permissions.') {
        super(403, message);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends ApiError {
    constructor(message = 'Resource not found') {
        super(404, message);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends ApiError {
    constructor(message = 'Resource already exists') {
        super(409, message);
    }
}
exports.ConflictError = ConflictError;
class UnprocessableError extends ApiError {
    constructor(message = 'Unprocessable entity', errors = []) {
        super(422, message, errors);
    }
}
exports.UnprocessableError = UnprocessableError;
class TooManyRequestsError extends ApiError {
    constructor(message = 'Too many requests. Please try again later.') {
        super(429, message);
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
class InternalError extends ApiError {
    constructor(message = 'Internal server error') {
        super(500, message, [], false);
    }
}
exports.InternalError = InternalError;
//# sourceMappingURL=apiError.js.map