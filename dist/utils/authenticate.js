"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.optionalAuthenticate = optionalAuthenticate;
const redis_1 = require("@config/redis");
const apiResponse_1 = require("@utils/apiResponse");
const constants_1 = require("@utils/constants");
const token_1 = require("@utils/token");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function authenticate(req, res, next) {
    try {
        const token = extractToken(req);
        if (token === null) {
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
        const blacklisted = await redis_1.redis.get(redis_1.RedisKeys.blacklistToken(decoded.jti));
        if (blacklisted !== null) {
            (0, apiResponse_1.sendError)(res, 'Token has been revoked. Please log in again.', 401);
            return;
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        next(error);
    }
}
async function optionalAuthenticate(req, _res, next) {
    try {
        const token = extractToken(req);
        if (token === null) {
            next();
            return;
        }
        const decoded = (0, token_1.verifyAccessToken)(token);
        const blacklisted = await redis_1.redis.get(redis_1.RedisKeys.blacklistToken(decoded.jti));
        if (blacklisted === null) {
            req.user = decoded;
        }
    }
    catch {
    }
    next();
}
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
//# sourceMappingURL=authenticate.js.map