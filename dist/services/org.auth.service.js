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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOrg = registerOrg;
exports.verifyOrgEmail = verifyOrgEmail;
exports.loginOrg = loginOrg;
exports.validateOrgTwoFa = validateOrgTwoFa;
exports.logoutOrg = logoutOrg;
exports.refreshOrgToken = refreshOrgToken;
exports.forgotOrgPassword = forgotOrgPassword;
exports.resetOrgPassword = resetOrgPassword;
exports.setupOrgTwoFa = setupOrgTwoFa;
exports.verifyAndEnableOrgTwoFa = verifyAndEnableOrgTwoFa;
exports.getOrgMe = getOrgMe;
const database_1 = require("@config/database");
const env_1 = require("@config/env");
const redis_1 = require("@config/redis");
const email_service_1 = require("@services/email.service");
const apiError_1 = require("@utils/apiError");
const token_1 = require("@utils/token");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
const uuid_1 = require("uuid");
async function registerOrg(data) {
    const existing = await database_1.prisma.organization.findUnique({
        where: { email: data.email },
        select: { id: true },
    });
    if (existing !== null) {
        throw new apiError_1.ConflictError('An organization with this email already exists');
    }
    const hashedPassword = await bcryptjs_1.default.hash(data.password, env_1.env.BCRYPT_ROUNDS);
    const rawToken = (0, token_1.generateSecureToken)();
    const hashedToken = (0, token_1.hashToken)(rawToken);
    const verifyExpiry = (0, token_1.getExpiryDate)('24h');
    await database_1.prisma.organization.create({
        data: {
            email: data.email,
            password: hashedPassword,
            emailVerifyToken: hashedToken,
            emailVerifyExpiry: verifyExpiry,
            profile: {
                create: { companyName: data.companyName },
            },
        },
    });
    const verifyUrl = `${env_1.env.FRONTEND_URL}/org/verify-email?token=${rawToken}`;
    await (0, email_service_1.sendOrgVerificationEmail)(data.email, data.companyName, verifyUrl);
    return {
        message: 'Organization registered successfully. Please verify your email. Your account will be reviewed and approved by our team.',
    };
}
async function verifyOrgEmail(token) {
    const hashedToken = (0, token_1.hashToken)(token);
    const org = await database_1.prisma.organization.findFirst({
        where: {
            emailVerifyToken: hashedToken,
            emailVerifyExpiry: { gt: new Date() },
        },
        select: { id: true, isEmailVerified: true },
    });
    if (org === null) {
        throw new apiError_1.BadRequestError('Invalid or expired verification token');
    }
    if (org.isEmailVerified) {
        return { message: 'Email is already verified' };
    }
    await database_1.prisma.organization.update({
        where: { id: org.id },
        data: {
            isEmailVerified: true,
            emailVerifyToken: null,
            emailVerifyExpiry: null,
        },
    });
    return { message: 'Email verified successfully. Awaiting admin approval to post jobs.' };
}
async function loginOrg(data) {
    const org = await database_1.prisma.organization.findUnique({
        where: { email: data.email },
        include: {
            profile: { select: { companyName: true, logoUrl: true } },
        },
    });
    if (org === null) {
        throw new apiError_1.UnauthorizedError('Invalid email or password');
    }
    if (!org.isActive) {
        throw new apiError_1.ForbiddenError('This organization account has been suspended. Please contact support.');
    }
    const isPasswordValid = await bcryptjs_1.default.compare(data.password, org.password);
    if (!isPasswordValid) {
        throw new apiError_1.UnauthorizedError('Invalid email or password');
    }
    if (!org.isEmailVerified) {
        throw new apiError_1.ForbiddenError('Please verify your email address before logging in.');
    }
    await database_1.prisma.organization.update({
        where: { id: org.id },
        data: { lastLoginAt: new Date() },
    });
    if (org.twoFactorEnabled) {
        const tempToken = (0, token_1.generateAccessToken)({
            sub: org.id,
            role: 'ORGANIZATION',
            email: org.email,
        });
        await redis_1.redis.setex(redis_1.RedisKeys.twoFaTempToken(org.id), redis_1.RedisExpiry.TWO_FA_TEMP, '1');
        return { requires2FA: true, tempToken };
    }
    const tokens = await issueOrgTokens(org.id, org.email, data.rememberMe);
    return { tokens, organization: mapOrgToAuthResponse(org) };
}
async function validateOrgTwoFa(data) {
    const { verifyAccessToken } = await Promise.resolve().then(() => __importStar(require('@utils/token')));
    let decoded;
    try {
        decoded = verifyAccessToken(data.tempToken);
    }
    catch {
        throw new apiError_1.UnauthorizedError('Invalid or expired session. Please log in again.');
    }
    const pending = await redis_1.redis.get(redis_1.RedisKeys.twoFaTempToken(decoded.sub));
    if (pending === null) {
        throw new apiError_1.UnauthorizedError('2FA session expired. Please log in again.');
    }
    const org = await database_1.prisma.organization.findUnique({
        where: { id: decoded.sub },
        include: { profile: { select: { companyName: true, logoUrl: true } } },
    });
    if (org?.twoFactorSecret == null) {
        throw new apiError_1.UnauthorizedError('Invalid session');
    }
    const result = (0, otplib_1.verifySync)({
        token: data.otp,
        secret: org.twoFactorSecret,
    });
    const isValid = result.valid;
    if (!isValid) {
        throw new apiError_1.UnauthorizedError('Invalid OTP code. Please try again.');
    }
    await redis_1.redis.del(redis_1.RedisKeys.twoFaTempToken(decoded.sub));
    const tokens = await issueOrgTokens(org.id, org.email, false);
    return { tokens, organization: mapOrgToAuthResponse(org) };
}
async function logoutOrg(accessToken, refreshToken) {
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
async function refreshOrgToken(rawRefreshToken) {
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
        await database_1.prisma.refreshToken.updateMany({
            where: { orgId: decoded.sub, isRevoked: false },
            data: { isRevoked: true },
        });
        throw new apiError_1.UnauthorizedError('Session expired or revoked. Please log in again.');
    }
    await database_1.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
    });
    const org = await database_1.prisma.organization.findUnique({
        where: { id: decoded.sub },
        select: { id: true, email: true, isActive: true },
    });
    if (org?.isActive !== true) {
        throw new apiError_1.UnauthorizedError('Account not found or suspended');
    }
    return issueOrgTokens(org.id, org.email, false);
}
async function forgotOrgPassword(email) {
    const genericResponse = {
        message: 'If an account with that email exists, a password reset link has been sent.',
    };
    const org = await database_1.prisma.organization.findUnique({
        where: { email },
        include: { profile: { select: { companyName: true } } },
    });
    if (org === null)
        return genericResponse;
    const rawToken = (0, token_1.generateSecureToken)();
    const hashedToken = (0, token_1.hashToken)(rawToken);
    const resetExpiry = (0, token_1.getExpiryDate)('1h');
    await database_1.prisma.organization.update({
        where: { id: org.id },
        data: {
            passwordResetToken: hashedToken,
            passwordResetExpiry: resetExpiry,
        },
    });
    const resetUrl = `${env_1.env.FRONTEND_URL}/org/reset-password?token=${rawToken}`;
    const name = org.profile?.companyName ?? 'Organization';
    await (0, email_service_1.sendPasswordResetEmail)(email, name, resetUrl);
    return genericResponse;
}
async function resetOrgPassword(data) {
    const hashedToken = (0, token_1.hashToken)(data.token);
    const org = await database_1.prisma.organization.findFirst({
        where: {
            passwordResetToken: hashedToken,
            passwordResetExpiry: { gt: new Date() },
        },
        include: { profile: { select: { companyName: true } } },
    });
    if (org === null) {
        throw new apiError_1.BadRequestError('Invalid or expired reset token. Please request a new one.');
    }
    const hashedPassword = await bcryptjs_1.default.hash(data.newPassword, env_1.env.BCRYPT_ROUNDS);
    await database_1.prisma.organization.update({
        where: { id: org.id },
        data: {
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpiry: null,
        },
    });
    await database_1.prisma.refreshToken.updateMany({
        where: { orgId: org.id, isRevoked: false },
        data: { isRevoked: true },
    });
    const name = org.profile?.companyName ?? 'Organization';
    await (0, email_service_1.sendPasswordChangedEmail)(org.email, name);
    return { message: 'Password reset successful. Please log in with your new password.' };
}
async function setupOrgTwoFa(orgId) {
    const org = await database_1.prisma.organization.findUnique({
        where: { id: orgId },
        include: { profile: { select: { companyName: true } } },
    });
    if (org === null)
        throw new apiError_1.NotFoundError('Organization not found');
    if (org.twoFactorEnabled) {
        throw new apiError_1.ConflictError('Two-factor authentication is already enabled');
    }
    const secret = (0, otplib_1.generateSecret)();
    const otpAuthUrl = (0, otplib_1.generateURI)({
        issuer: 'CareerArch',
        label: org.email,
        secret,
    });
    const qrCodeUrl = await qrcode_1.default.toDataURL(otpAuthUrl);
    await database_1.prisma.organization.update({
        where: { id: orgId },
        data: { twoFactorSecret: secret },
    });
    const backupCodes = generateBackupCodes();
    return { qrCodeUrl, manualKey: secret, backupCodes };
}
async function verifyAndEnableOrgTwoFa(orgId, otp) {
    const org = await database_1.prisma.organization.findUnique({ where: { id: orgId } });
    if (org === null)
        throw new apiError_1.NotFoundError('Organization not found');
    if (org.twoFactorSecret === null) {
        throw new apiError_1.BadRequestError('Please initiate 2FA setup first');
    }
    if (org.twoFactorEnabled) {
        throw new apiError_1.ConflictError('Two-factor authentication is already enabled');
    }
    const isValid = (0, otplib_1.verifySync)({ token: otp, secret: org.twoFactorSecret }).valid;
    if (!isValid) {
        throw new apiError_1.BadRequestError('Invalid OTP. Please try again.');
    }
    await database_1.prisma.organization.update({
        where: { id: orgId },
        data: { twoFactorEnabled: true },
    });
    await (0, email_service_1.sendTwoFaEnabledEmail)(org.email, 'Team');
    const backupCodes = generateBackupCodes();
    return {
        message: '2FA enabled successfully. Store your backup codes safely.',
        backupCodes,
    };
}
async function getOrgMe(orgId) {
    const org = await database_1.prisma.organization.findUnique({
        where: { id: orgId },
        include: {
            profile: { select: { companyName: true, logoUrl: true } },
        },
    });
    if (org === null)
        throw new apiError_1.NotFoundError('Organization not found');
    return mapOrgToAuthResponse(org);
}
async function issueOrgTokens(orgId, email, rememberMe) {
    const payload = { sub: orgId, role: 'ORGANIZATION', email };
    const accessToken = (0, token_1.generateAccessToken)(payload);
    const refreshToken = rememberMe
        ? (0, token_1.generateRefreshTokenRememberMe)(payload)
        : (0, token_1.generateRefreshToken)(payload);
    const expiresAt = rememberMe ? (0, token_1.getExpiryDate)('30d') : (0, token_1.getExpiryDate)('7d');
    const hashedRefresh = (0, token_1.hashToken)(refreshToken);
    await database_1.prisma.refreshToken.create({
        data: {
            id: (0, uuid_1.v4)(),
            token: hashedRefresh,
            orgId,
            expiresAt,
        },
    });
    return { accessToken, refreshToken };
}
function mapOrgToAuthResponse(org) {
    return {
        id: org.id,
        email: org.email,
        role: org.role,
        isEmailVerified: org.isEmailVerified,
        isApproved: org.isApproved,
        twoFactorEnabled: org.twoFactorEnabled,
        profile: org.profile !== null
            ? { companyName: org.profile.companyName, logoUrl: org.profile.logoUrl }
            : null,
    };
}
function generateBackupCodes(count = 8) {
    return Array.from({ length: count }, () => `${(0, token_1.generateSecureToken)(4).toUpperCase()}-${(0, token_1.generateSecureToken)(4).toUpperCase()}`);
}
//# sourceMappingURL=org.auth.service.js.map