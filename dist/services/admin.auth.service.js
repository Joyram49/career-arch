"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginAdmin = loginAdmin;
exports.logoutAdmin = logoutAdmin;
exports.refreshAdminToken = refreshAdminToken;
exports.getAdminMe = getAdminMe;
const database_1 = require("@config/database");
const redis_1 = require("@config/redis");
const apiError_1 = require("@utils/apiError");
const token_1 = require("@utils/token");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
async function loginAdmin(data) {
    const admin = await database_1.prisma.admin.findUnique({
        where: { email: data.email },
    });
    if (admin === null) {
        throw new apiError_1.UnauthorizedError('Invalid email or password');
    }
    const isPasswordValid = await bcryptjs_1.default.compare(data.password, admin.password);
    if (!isPasswordValid) {
        throw new apiError_1.UnauthorizedError('Invalid email or password');
    }
    const payload = { sub: admin.id, role: 'ADMIN', email: admin.email };
    const accessToken = (0, token_1.generateAccessToken)(payload);
    const refreshToken = (0, token_1.generateRefreshToken)(payload);
    await database_1.prisma.refreshToken.create({
        data: {
            id: (0, uuid_1.v4)(),
            token: (0, token_1.hashToken)(refreshToken),
            expiresAt: (0, token_1.getExpiryDate)('7d'),
        },
    });
    return {
        tokens: { accessToken, refreshToken },
        admin: {
            id: admin.id,
            email: admin.email,
            role: admin.role,
            name: admin.name,
        },
    };
}
async function logoutAdmin(accessToken, refreshToken) {
    const jti = (0, token_1.extractJti)(accessToken);
    const ttl = (0, token_1.getTokenTtl)(accessToken);
    if (jti !== null && ttl > 0) {
        await redis_1.redis.setex(redis_1.RedisKeys.blacklistToken(jti), ttl, '1');
    }
    const hashedRefresh = (0, token_1.hashToken)(refreshToken);
    await database_1.prisma.refreshToken.updateMany({
        where: { token: hashedRefresh, isRevoked: false },
        data: { isRevoked: true },
    });
}
async function refreshAdminToken(rawRefreshToken) {
    let decoded;
    try {
        decoded = (0, token_1.verifyRefreshToken)(rawRefreshToken);
    }
    catch {
        throw new apiError_1.UnauthorizedError('Invalid or expired refresh token. Please log in again.');
    }
    const hashedToken = (0, token_1.hashToken)(rawRefreshToken);
    const storedToken = await database_1.prisma.refreshToken.findUnique({
        where: { token: hashedToken },
    });
    if (storedToken === null || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
        throw new apiError_1.UnauthorizedError('Session expired. Please log in again.');
    }
    await database_1.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
    });
    const admin = await database_1.prisma.admin.findUnique({
        where: { id: decoded.sub },
    });
    if (admin === null) {
        throw new apiError_1.UnauthorizedError('Admin account not found');
    }
    const payload = { sub: admin.id, role: 'ADMIN', email: admin.email };
    const newAccessToken = (0, token_1.generateAccessToken)(payload);
    const newRefreshToken = (0, token_1.generateRefreshToken)(payload);
    await database_1.prisma.refreshToken.create({
        data: {
            id: (0, uuid_1.v4)(),
            token: (0, token_1.hashToken)(newRefreshToken),
            expiresAt: (0, token_1.getExpiryDate)('7d'),
        },
    });
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
async function getAdminMe(adminId) {
    const admin = await database_1.prisma.admin.findUnique({
        where: { id: adminId },
    });
    if (admin === null)
        throw new apiError_1.NotFoundError('Admin not found');
    return {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        name: admin.name,
    };
}
//# sourceMappingURL=admin.auth.service.js.map