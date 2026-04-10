"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const env_1 = require("@config/env");
const logger_1 = require("@config/logger");
const client_1 = require("@prisma/client");
const apiError_1 = require("@utils/apiError");
const apiResponse_1 = require("@utils/apiResponse");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function errorHandler(err, req, res, _next) {
    logger_1.logger.error({
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
    });
    if (err instanceof apiError_1.ApiError) {
        (0, apiResponse_1.sendError)(res, err.message, err.statusCode, err.errors);
        return;
    }
    if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
        (0, apiResponse_1.sendError)(res, 'Token has expired', 401);
        return;
    }
    if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
        (0, apiResponse_1.sendError)(res, 'Invalid token', 401);
        return;
    }
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002':
                (0, apiResponse_1.sendError)(res, 'A record with this information already exists', 409);
                return;
            case 'P2025':
                (0, apiResponse_1.sendError)(res, 'Record not found', 404);
                return;
            case 'P2003':
                (0, apiResponse_1.sendError)(res, 'Related record not found', 400);
                return;
            default:
                (0, apiResponse_1.sendError)(res, 'Database operation failed', 500);
                return;
        }
    }
    if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        (0, apiResponse_1.sendError)(res, 'Invalid data provided', 400);
        return;
    }
    if (err instanceof client_1.Prisma.PrismaClientInitializationError) {
        (0, apiResponse_1.sendError)(res, 'Database connection failed', 503);
        return;
    }
    if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
        (0, apiResponse_1.sendError)(res, 'Invalid JSON in request body', 400);
        return;
    }
    let message = 'An unexpected error occurred';
    if (env_1.env.NODE_ENV === 'production') {
        message = 'Something went wrong. Please try again later.';
    }
    else if (err instanceof Error) {
        message = err.message;
    }
    (0, apiResponse_1.sendError)(res, message, 500);
}
function notFoundHandler(req, res) {
    (0, apiResponse_1.sendError)(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
}
//# sourceMappingURL=errorHandler.js.map