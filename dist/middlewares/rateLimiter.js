"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.forgotPasswordLimiter = exports.registerLimiter = exports.loginLimiter = exports.generalLimiter = void 0;
const apiResponse_1 = require("@utils/apiResponse");
const constants_1 = require("@utils/constants");
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
const rateLimitHandler = (_req, res) => {
    (0, apiResponse_1.sendError)(res, 'Too many requests. Please slow down and try again later.', 429);
};
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: constants_1.RATE_LIMIT.WINDOW_MS,
    max: constants_1.RATE_LIMIT.MAX_GENERAL,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitHandler,
    keyGenerator: (req) => (0, express_rate_limit_1.ipKeyGenerator)(req.ip ?? req.socket.remoteAddress ?? 'unknown'),
});
exports.loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: constants_1.RATE_LIMIT.WINDOW_MS,
    max: constants_1.RATE_LIMIT.MAX_LOGIN,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
        (0, apiResponse_1.sendError)(res, 'Too many login attempts. Account temporarily locked. Please try again in 15 minutes.', 429);
    },
    keyGenerator: (req) => {
        const email = req.body.email ?? '';
        const ip = (0, express_rate_limit_1.ipKeyGenerator)(req.ip ?? req.socket.remoteAddress ?? 'unknown');
        return `${ip}:${email}`;
    },
});
exports.registerLimiter = (0, express_rate_limit_1.default)({
    windowMs: constants_1.RATE_LIMIT.WINDOW_MS,
    max: constants_1.RATE_LIMIT.MAX_REGISTER,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitHandler,
    keyGenerator: (req) => (0, express_rate_limit_1.ipKeyGenerator)(req.ip ?? req.socket.remoteAddress ?? 'unknown'),
});
exports.forgotPasswordLimiter = (0, express_rate_limit_1.default)({
    windowMs: constants_1.RATE_LIMIT.WINDOW_MS,
    max: constants_1.RATE_LIMIT.MAX_FORGOT_PASSWORD,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitHandler,
    keyGenerator: (req) => (0, express_rate_limit_1.ipKeyGenerator)(req.ip ?? req.socket.remoteAddress ?? 'unknown'),
});
//# sourceMappingURL=rateLimiter.js.map