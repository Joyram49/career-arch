"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.generateRefreshTokenRememberMe = generateRefreshTokenRememberMe;
exports.verifyRefreshToken = verifyRefreshToken;
exports.generateSecureToken = generateSecureToken;
exports.hashToken = hashToken;
exports.compareToken = compareToken;
exports.getExpiryDate = getExpiryDate;
exports.generateOtp = generateOtp;
exports.extractJti = extractJti;
exports.getTokenTtl = getTokenTtl;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("@config/env");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
function generateAccessToken(payload) {
    const jti = (0, uuid_1.v4)();
    return jsonwebtoken_1.default.sign({ ...payload, jti }, env_1.env.JWT_ACCESS_SECRET, {
        expiresIn: env_1.env.JWT_ACCESS_EXPIRY,
    });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
}
function generateRefreshToken(payload) {
    const jti = (0, uuid_1.v4)();
    return jsonwebtoken_1.default.sign({ ...payload, jti }, env_1.env.JWT_REFRESH_SECRET, {
        expiresIn: env_1.env.JWT_REFRESH_EXPIRY,
    });
}
function generateRefreshTokenRememberMe(payload) {
    const jti = (0, uuid_1.v4)();
    return jsonwebtoken_1.default.sign({ ...payload, jti }, env_1.env.JWT_REFRESH_SECRET, {
        expiresIn: env_1.env.JWT_REFRESH_EXPIRY_REMEMBER_ME,
    });
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, env_1.env.JWT_REFRESH_SECRET);
}
function generateSecureToken(bytes = 32) {
    return crypto_1.default.randomBytes(bytes).toString('hex');
}
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
function compareToken(rawToken, hashedToken) {
    const hashed = hashToken(rawToken);
    return crypto_1.default.timingSafeEqual(Buffer.from(hashed), Buffer.from(hashedToken));
}
function getExpiryDate(duration) {
    const now = Date.now();
    const units = {
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
function generateOtp(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
}
function extractJti(token) {
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        return decoded?.jti ?? null;
    }
    catch {
        return null;
    }
}
function getTokenTtl(token) {
    try {
        const decoded = jsonwebtoken_1.default.decode(token);
        if (decoded?.exp === undefined)
            return 0;
        const remaining = decoded.exp - Math.floor(Date.now() / 1000);
        return Math.max(0, remaining);
    }
    catch {
        return 0;
    }
}
//# sourceMappingURL=token.js.map