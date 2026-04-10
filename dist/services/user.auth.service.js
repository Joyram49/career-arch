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
exports.registerUser = registerUser;
exports.verifyEmail = verifyEmail;
exports.resendVerificationEmail = resendVerificationEmail;
exports.loginUser = loginUser;
exports.validateTwoFa = validateTwoFa;
exports.logoutUser = logoutUser;
exports.refreshUserToken = refreshUserToken;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.setupTwoFa = setupTwoFa;
exports.verifyAndEnableTwoFa = verifyAndEnableTwoFa;
exports.disableTwoFa = disableTwoFa;
exports.getUserMe = getUserMe;
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
async function registerUser(data) {
    const existing = await database_1.prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
    });
    if (existing !== null) {
        throw new apiError_1.ConflictError('An account with this email already exists');
    }
    const hashedPassword = await bcryptjs_1.default.hash(data.password, env_1.env.BCRYPT_ROUNDS);
    const rawToken = (0, token_1.generateSecureToken)();
    const hashedToken = (0, token_1.hashToken)(rawToken);
    const verifyExpiry = (0, token_1.getExpiryDate)('24h');
    await database_1.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                emailVerifyToken: hashedToken,
                emailVerifyExpiry: verifyExpiry,
                profile: {
                    create: {
                        firstName: data.firstName,
                        lastName: data.lastName,
                    },
                },
            },
        });
        await tx.subscription.create({
            data: {
                userId: user.id,
                plan: 'FREE',
                status: 'ACTIVE',
            },
        });
        return user;
    });
    const verifyUrl = `${env_1.env.FRONTEND_URL}/verify-email?token=${rawToken}`;
    await (0, email_service_1.sendVerificationEmail)(data.email, data.firstName, verifyUrl);
    return { message: 'Registration successful. Please check your email to verify your account.' };
}
async function verifyEmail(token) {
    const hashedToken = (0, token_1.hashToken)(token);
    const user = await database_1.prisma.user.findFirst({
        where: {
            emailVerifyToken: hashedToken,
            emailVerifyExpiry: { gt: new Date() },
        },
        select: {
            id: true,
            isEmailVerified: true,
        },
    });
    if (user === null) {
        throw new apiError_1.BadRequestError('Invalid or expired verification token');
    }
    if (user.isEmailVerified) {
        return { message: 'Email is already verified' };
    }
    await database_1.prisma.user.update({
        where: { id: user.id },
        data: {
            isEmailVerified: true,
            emailVerifyToken: null,
            emailVerifyExpiry: null,
        },
    });
    return { message: 'Email verified successfully. You can now log in.' };
}
async function resendVerificationEmail(email) {
    const user = await database_1.prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            isEmailVerified: true,
            profile: { select: { firstName: true } },
        },
    });
    const genericResponse = {
        message: 'If an unverified account exists with this email, a new verification link has been sent.',
    };
    if (user === null || user.isEmailVerified) {
        return genericResponse;
    }
    const rawToken = (0, token_1.generateSecureToken)();
    const hashedToken = (0, token_1.hashToken)(rawToken);
    const verifyExpiry = (0, token_1.getExpiryDate)('24h');
    await database_1.prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerifyToken: hashedToken,
            emailVerifyExpiry: verifyExpiry,
        },
    });
    const firstName = user.profile?.firstName ?? 'User';
    const verifyUrl = `${env_1.env.FRONTEND_URL}/verify-email?token=${rawToken}`;
    await (0, email_service_1.sendVerificationEmail)(email, firstName, verifyUrl);
    return genericResponse;
}
async function loginUser(data) {
    const user = await database_1.prisma.user.findUnique({
        where: { email: data.email },
        include: {
            profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
            subscription: { select: { plan: true, status: true } },
        },
    });
    if (user === null) {
        throw new apiError_1.UnauthorizedError('Invalid email or password');
    }
    if (!user.isActive) {
        throw new apiError_1.ForbiddenError('Your account has been suspended. Please contact support.');
    }
    const isPasswordValid = await bcryptjs_1.default.compare(data.password, user.password);
    if (!isPasswordValid) {
        throw new apiError_1.UnauthorizedError('Invalid email or password');
    }
    if (!user.isEmailVerified) {
        throw new apiError_1.ForbiddenError('Please verify your email address before logging in. Check your inbox for the verification link.');
    }
    await database_1.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });
    if (user.twoFactorEnabled) {
        const tempToken = (0, token_1.generateAccessToken)({
            sub: user.id,
            role: 'USER',
            email: user.email,
        });
        await redis_1.redis.setex(redis_1.RedisKeys.twoFaTempToken(user.id), redis_1.RedisExpiry.TWO_FA_TEMP, '1');
        return { requires2FA: true, tempToken };
    }
    const tokens = await issueTokens(user.id, 'USER', user.email, data.rememberMe, user.subscription?.plan ?? 'FREE');
    return {
        tokens,
        user: mapUserToAuthResponse(user),
    };
}
async function validateTwoFa(data) {
    let decoded;
    try {
        const { verifyAccessToken } = await Promise.resolve().then(() => __importStar(require('@utils/token')));
        decoded = verifyAccessToken(data.tempToken);
    }
    catch {
        throw new apiError_1.UnauthorizedError('Invalid or expired session. Please log in again.');
    }
    const pending = await redis_1.redis.get(redis_1.RedisKeys.twoFaTempToken(decoded.sub));
    if (pending === null) {
        throw new apiError_1.UnauthorizedError('2FA session expired. Please log in again.');
    }
    const user = await database_1.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: {
            profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
            subscription: { select: { plan: true, status: true } },
        },
    });
    if (user?.twoFactorSecret == null) {
        throw new apiError_1.UnauthorizedError('Invalid session');
    }
    const isValid = (0, otplib_1.verifySync)({
        token: data.otp,
        secret: user.twoFactorSecret,
    }).valid;
    if (!isValid) {
        throw new apiError_1.UnauthorizedError('Invalid OTP code. Please try again.');
    }
    await redis_1.redis.del(redis_1.RedisKeys.twoFaTempToken(decoded.sub));
    const tokens = await issueTokens(user.id, 'USER', user.email, false, user.subscription?.plan ?? 'FREE');
    return { tokens, user: mapUserToAuthResponse(user) };
}
async function logoutUser(accessToken, refreshToken) {
    const { extractJti, getTokenTtl: getTtl } = await Promise.resolve().then(() => __importStar(require('@utils/token')));
    const jti = extractJti(accessToken);
    const ttl = getTtl(accessToken);
    if (jti !== null && ttl > 0) {
        await redis_1.redis.setex(redis_1.RedisKeys.blacklistToken(jti), ttl, '1');
    }
    const hashedRefresh = (0, token_1.hashToken)(refreshToken);
    await database_1.prisma.refreshToken.updateMany({
        where: { token: hashedRefresh, isRevoked: false },
        data: { isRevoked: true },
    });
}
async function refreshUserToken(rawRefreshToken) {
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
            where: { userId: decoded.sub, isRevoked: false },
            data: { isRevoked: true },
        });
        throw new apiError_1.UnauthorizedError('Session expired or revoked. Please log in again.');
    }
    await database_1.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
    });
    const user = await database_1.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { subscription: { select: { plan: true } } },
    });
    if (user?.isActive !== true) {
        throw new apiError_1.UnauthorizedError('Account not found or suspended');
    }
    return issueTokens(user.id, 'USER', user.email, false, user.subscription?.plan ?? 'FREE');
}
async function forgotPassword(email) {
    const genericResponse = {
        message: 'If an account with that email exists, a password reset link has been sent.',
    };
    const user = await database_1.prisma.user.findUnique({
        where: { email },
        include: { profile: { select: { firstName: true } } },
    });
    if (user === null)
        return genericResponse;
    const rawToken = (0, token_1.generateSecureToken)();
    const hashedToken = (0, token_1.hashToken)(rawToken);
    const resetExpiry = (0, token_1.getExpiryDate)('1h');
    await database_1.prisma.user.update({
        where: { id: user.id },
        data: {
            passwordResetToken: hashedToken,
            passwordResetExpiry: resetExpiry,
        },
    });
    const resetUrl = `${env_1.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
    const firstName = user.profile?.firstName ?? 'User';
    await (0, email_service_1.sendPasswordResetEmail)(email, firstName, resetUrl);
    return genericResponse;
}
async function resetPassword(data) {
    const hashedToken = (0, token_1.hashToken)(data.token);
    const user = await database_1.prisma.user.findFirst({
        where: {
            passwordResetToken: hashedToken,
            passwordResetExpiry: { gt: new Date() },
        },
        include: { profile: { select: { firstName: true } } },
    });
    if (user === null) {
        throw new apiError_1.BadRequestError('Invalid or expired reset token. Please request a new one.');
    }
    const hashedPassword = await bcryptjs_1.default.hash(data.newPassword, env_1.env.BCRYPT_ROUNDS);
    await database_1.prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpiry: null,
        },
    });
    await database_1.prisma.refreshToken.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true },
    });
    const firstName = user.profile?.firstName ?? 'User';
    await (0, email_service_1.sendPasswordChangedEmail)(user.email, firstName);
    return { message: 'Password reset successful. Please log in with your new password.' };
}
async function setupTwoFa(userId) {
    const user = await database_1.prisma.user.findUnique({
        where: { id: userId },
        include: { profile: { select: { firstName: true, lastName: true } } },
    });
    if (user === null)
        throw new apiError_1.NotFoundError('User not found');
    if (user.twoFactorEnabled) {
        throw new apiError_1.ConflictError('Two-factor authentication is already enabled');
    }
    const secret = (0, otplib_1.generateSecret)();
    const serviceName = 'CareerArch';
    const otpAuthUrl = (0, otplib_1.generateURI)({
        issuer: serviceName,
        label: user.email,
        secret,
    });
    const qrCodeUrl = await qrcode_1.default.toDataURL(otpAuthUrl);
    await database_1.prisma.user.update({
        where: { id: userId },
        data: { twoFactorSecret: secret },
    });
    const backupCodes = generateBackupCodes();
    return {
        qrCodeUrl,
        manualKey: secret,
        backupCodes,
    };
}
async function verifyAndEnableTwoFa(userId, otp) {
    const user = await database_1.prisma.user.findUnique({
        where: { id: userId },
        include: { profile: { select: { firstName: true } } },
    });
    if (user === null)
        throw new apiError_1.NotFoundError('User not found');
    if (user.twoFactorSecret === null) {
        throw new apiError_1.BadRequestError('Please initiate 2FA setup first');
    }
    if (user.twoFactorEnabled) {
        throw new apiError_1.ConflictError('Two-factor authentication is already enabled');
    }
    const isValid = (0, otplib_1.verifySync)({ token: otp, secret: user.twoFactorSecret }).valid;
    if (!isValid) {
        throw new apiError_1.BadRequestError('Invalid OTP. Please scan the QR code again and try.');
    }
    await database_1.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
    });
    const firstName = user.profile?.firstName ?? 'User';
    await (0, email_service_1.sendTwoFaEnabledEmail)(user.email, firstName);
    const backupCodes = generateBackupCodes();
    return { message: '2FA enabled successfully. Store your backup codes safely.', backupCodes };
}
async function disableTwoFa(userId, password, otp) {
    const user = await database_1.prisma.user.findUnique({ where: { id: userId } });
    if (user === null)
        throw new apiError_1.NotFoundError('User not found');
    if (!user.twoFactorEnabled) {
        throw new apiError_1.BadRequestError('Two-factor authentication is not enabled');
    }
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
    if (!isPasswordValid)
        throw new apiError_1.UnauthorizedError('Incorrect password');
    if (user.twoFactorSecret === null)
        throw new apiError_1.BadRequestError('2FA secret not found');
    const isOtpValid = (0, otplib_1.verifySync)({ token: otp, secret: user.twoFactorSecret }).valid;
    if (!isOtpValid)
        throw new apiError_1.UnauthorizedError('Invalid OTP code');
    await database_1.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return { message: '2FA disabled successfully.' };
}
async function getUserMe(userId) {
    const user = await database_1.prisma.user.findUnique({
        where: { id: userId },
        include: {
            profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
            subscription: { select: { plan: true, status: true } },
        },
    });
    if (user === null)
        throw new apiError_1.NotFoundError('User not found');
    return mapUserToAuthResponse(user);
}
async function issueTokens(userId, role, email, rememberMe, plan) {
    const payload = { sub: userId, role, email, plan: plan };
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
            userId,
            expiresAt,
        },
    });
    return { accessToken, refreshToken };
}
function mapUserToAuthResponse(user) {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        profile: user.profile !== null
            ? {
                firstName: user.profile.firstName,
                lastName: user.profile.lastName,
                avatarUrl: user.profile.avatarUrl,
            }
            : null,
        subscription: user.subscription !== null
            ? {
                plan: user.subscription.plan,
                status: user.subscription.status,
            }
            : null,
    };
}
function generateBackupCodes(count = 8) {
    return Array.from({ length: count }, () => `${(0, token_1.generateSecureToken)(4).toUpperCase()}-${(0, token_1.generateSecureToken)(4).toUpperCase()}`);
}
//# sourceMappingURL=user.auth.service.js.map