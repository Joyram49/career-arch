"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticate = exports.authenticate = void 0;
const redis_1 = require("@config/redis");
const apiResponse_1 = require("@utils/apiResponse");
const constants_1 = require("@utils/constants");
const token_1 = require("@utils/token");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (token === null || token.length === 0) {
            (0, apiResponse_1.sendError)(res, 'Access token is missing', 401);
            return;
        }
        let decoded;
        try {
            decoded = (0, token_1.verifyAccessToken)(token);
        }
        catch (err) {
            if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
                (0, apiResponse_1.sendError)(res, 'Access token has expired', 401);
                return;
            }
            if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                (0, apiResponse_1.sendError)(res, 'Invalid access token', 401);
                return;
            }
            throw err;
        }
        const jti = extractJtiFromPayload(decoded);
        if (jti === null) {
            (0, apiResponse_1.sendError)(res, 'Invalid access token', 401);
            return;
        }
        const blacklisted = await redis_1.redis.get(redis_1.RedisKeys.blacklistToken(jti));
        if (blacklisted !== null) {
            (0, apiResponse_1.sendError)(res, 'Token has been revoked. Please log in again.', 401);
            return;
        }
        attachUserToRequest(req, decoded);
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
const optionalAuthenticate = async (req, _res, next) => {
    try {
        const token = extractToken(req);
        if (token === null || token.length === 0) {
            next();
            return;
        }
        const decoded = (0, token_1.verifyAccessToken)(token);
        const jti = extractJtiFromPayload(decoded);
        if (jti === null) {
            next();
            return;
        }
        const blacklisted = await redis_1.redis.get(redis_1.RedisKeys.blacklistToken(jti));
        if (blacklisted === null) {
            attachUserToRequest(req, decoded);
        }
    }
    catch {
    }
    next();
};
exports.optionalAuthenticate = optionalAuthenticate;
function extractToken(req) {
    const authHeader = req.headers['authorization'];
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    const cookieToken = req.cookies[constants_1.COOKIE_NAMES.ACCESS_TOKEN];
    if (typeof cookieToken === 'string' && cookieToken.length > 0) {
        return cookieToken;
    }
    return null;
}
function extractJtiFromPayload(payload) {
    if (typeof payload !== 'object' || payload === null || !('jti' in payload)) {
        return null;
    }
    const maybePayload = payload;
    return typeof maybePayload.jti === 'string' && maybePayload.jti.length > 0
        ? maybePayload.jti
        : null;
}
function attachUserToRequest(req, payload) {
    Object.defineProperty(req, 'user', {
        value: payload,
        writable: true,
        configurable: true,
        enumerable: true,
    });
}
//# sourceMappingURL=authenticate.js.map