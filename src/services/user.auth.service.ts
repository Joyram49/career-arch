import { prisma } from '@config/database';
import { env } from '@config/env';
import { redis, RedisExpiry, RedisKeys } from '@config/redis';
import {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendTwoFaEnabledEmail,
  sendVerificationEmail,
} from '@services/email.service';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '@utils/apiError';
import {
  generateAccessToken,
  generateRefreshToken,
  generateRefreshTokenRememberMe,
  generateSecureToken,
  getExpiryDate,
  hashToken,
  verifyRefreshToken,
} from '@utils/token';
import bcrypt from 'bcryptjs';
import { generateSecret, generateURI, verifySync } from 'otplib';
import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

import type { ITokenPair, ITwoFactorSetupResponse, IUserAuthResponse } from '@app-types/index';

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────

export async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<{ message: string }> {
  // Check duplicate email
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });

  if (existing !== null) {
    throw new ConflictError('An account with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

  // Generate email verification token
  const rawToken = generateSecureToken();
  const hashedToken = hashToken(rawToken);
  const verifyExpiry = getExpiryDate('24h');

  // Create user + profile + subscription in one transaction
  await prisma.$transaction(async (tx) => {
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

    // Auto-assign FREE subscription
    await tx.subscription.create({
      data: {
        userId: user.id,
        plan: 'FREE',
        status: 'ACTIVE',
      },
    });

    return user;
  });

  // Send verification email (outside transaction to not block it)
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;
  await sendVerificationEmail(data.email, data.firstName, verifyUrl);

  return { message: 'Registration successful. Please check your email to verify your account.' };
}

// ─────────────────────────────────────────────
// VERIFY EMAIL
// ─────────────────────────────────────────────

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const hashedToken = hashToken(token);

  const user = await prisma.user.findFirst({
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
    throw new BadRequestError('Invalid or expired verification token');
  }

  if (user.isEmailVerified) {
    return { message: 'Email is already verified' };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiry: null,
    },
  });

  return { message: 'Email verified successfully. You can now log in.' };
}

// ─────────────────────────────────────────────
// RESEND VERIFICATION EMAIL
// ─────────────────────────────────────────────

export async function resendVerificationEmail(email: string): Promise<{ message: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      isEmailVerified: true,
      profile: { select: { firstName: true } },
    },
  });

  // Generic response to prevent email enumeration
  const genericResponse = {
    message:
      'If an unverified account exists with this email, a new verification link has been sent.',
  };

  if (user === null || user.isEmailVerified) {
    return genericResponse;
  }

  const rawToken = generateSecureToken();
  const hashedToken = hashToken(rawToken);
  const verifyExpiry = getExpiryDate('24h');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifyToken: hashedToken,
      emailVerifyExpiry: verifyExpiry,
    },
  });

  const firstName = user.profile?.firstName ?? 'User';
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;
  await sendVerificationEmail(email, firstName, verifyUrl);

  return genericResponse;
}

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────

export interface ILoginResult {
  requires2FA?: boolean;
  tempToken?: string;
  tokens?: ITokenPair;
  user?: IUserAuthResponse;
}

export async function loginUser(data: {
  email: string;
  password: string;
  rememberMe: boolean;
}): Promise<ILoginResult> {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: {
      profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
      subscription: { select: { plan: true, status: true } },
    },
  });

  // Generic error to prevent user enumeration
  if (user === null) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.isActive) {
    throw new ForbiddenError('Your account has been suspended. Please contact support.');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(data.password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.isEmailVerified) {
    throw new ForbiddenError(
      'Please verify your email address before logging in. Check your inbox for the verification link.',
    );
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // 2FA check
  if (user.twoFactorEnabled) {
    // Issue a short-lived temp token for the 2FA validation step
    const tempToken = generateAccessToken({
      sub: user.id,
      role: 'USER',
      email: user.email,
    });

    // Store in Redis with 5 min expiry — flagged as pending 2FA
    await redis.setex(RedisKeys.twoFaTempToken(user.id), RedisExpiry.TWO_FA_TEMP, '1');

    return { requires2FA: true, tempToken };
  }

  // Generate tokens
  const tokens = await issueTokens(
    user.id,
    'USER',
    user.email,
    data.rememberMe,
    user.subscription?.plan ?? 'FREE',
  );

  return {
    tokens,
    user: mapUserToAuthResponse(user),
  };
}

// ─────────────────────────────────────────────
// VALIDATE 2FA
// ─────────────────────────────────────────────

export async function validateTwoFa(data: {
  tempToken: string;
  otp: string;
}): Promise<{ tokens: ITokenPair; user: IUserAuthResponse }> {
  // Verify the temp token
  let decoded;
  try {
    const { verifyAccessToken } = await import('@utils/token');
    decoded = verifyAccessToken(data.tempToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired session. Please log in again.');
  }

  // Check that 2FA is actually pending for this user
  const pending = await redis.get(RedisKeys.twoFaTempToken(decoded.sub));
  if (pending === null) {
    throw new UnauthorizedError('2FA session expired. Please log in again.');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    include: {
      profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
      subscription: { select: { plan: true, status: true } },
    },
  });

  if (user?.twoFactorSecret == null) {
    throw new UnauthorizedError('Invalid session');
  }

  // Verify OTP
  const isValid = verifySync({
    token: data.otp,
    secret: user.twoFactorSecret,
  }).valid;

  if (!isValid) {
    throw new UnauthorizedError('Invalid OTP code. Please try again.');
  }

  // Clear the pending 2FA flag
  await redis.del(RedisKeys.twoFaTempToken(decoded.sub));

  // Issue full tokens
  const tokens = await issueTokens(
    user.id,
    'USER',
    user.email,
    false,
    user.subscription?.plan ?? 'FREE',
  );

  return { tokens, user: mapUserToAuthResponse(user) };
}

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────

export async function logoutUser(accessToken: string, refreshToken: string): Promise<void> {
  // 1. Blacklist the access token (TTL = remaining lifetime)
  const { extractJti, getTokenTtl: getTtl } = await import('@utils/token');
  const jti = extractJti(accessToken);
  const ttl = getTtl(accessToken);

  if (jti !== null && ttl > 0) {
    await redis.setex(RedisKeys.blacklistToken(jti), ttl, '1');
  }

  // 2. Revoke refresh token in DB
  const hashedRefresh = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { token: hashedRefresh, isRevoked: false },
    data: { isRevoked: true },
  });
}

// ─────────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────────

export async function refreshUserToken(rawRefreshToken: string): Promise<ITokenPair> {
  let decoded;
  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token. Please log in again.');
  }

  const hashedToken = hashToken(rawRefreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: hashedToken },
  });

  if (storedToken === null || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
    // Possible token theft — revoke all tokens for this user
    await prisma.refreshToken.updateMany({
      where: { userId: decoded.sub, isRevoked: false },
      data: { isRevoked: true },
    });
    throw new UnauthorizedError('Session expired or revoked. Please log in again.');
  }

  // Rotate: revoke old token
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { isRevoked: true },
  });

  // Get fresh user data
  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    include: { subscription: { select: { plan: true } } },
  });

  if (user?.isActive !== true) {
    throw new UnauthorizedError('Account not found or suspended');
  }

  return issueTokens(user.id, 'USER', user.email, false, user.subscription?.plan ?? 'FREE');
}

// ─────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const genericResponse = {
    message: 'If an account with that email exists, a password reset link has been sent.',
  };

  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: { select: { firstName: true } } },
  });

  if (user === null) return genericResponse;

  const rawToken = generateSecureToken();
  const hashedToken = hashToken(rawToken);
  const resetExpiry = getExpiryDate('1h');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetExpiry: resetExpiry,
    },
  });

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;
  const firstName = user.profile?.firstName ?? 'User';
  await sendPasswordResetEmail(email, firstName, resetUrl);

  return genericResponse;
}

// ─────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────

export async function resetPassword(data: {
  token: string;
  newPassword: string;
}): Promise<{ message: string }> {
  const hashedToken = hashToken(data.token);

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpiry: { gt: new Date() },
    },
    include: { profile: { select: { firstName: true } } },
  });

  if (user === null) {
    throw new BadRequestError('Invalid or expired reset token. Please request a new one.');
  }

  const hashedPassword = await bcrypt.hash(data.newPassword, env.BCRYPT_ROUNDS);

  // Update password & clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  // Revoke all refresh tokens (force re-login on all devices)
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, isRevoked: false },
    data: { isRevoked: true },
  });

  const firstName = user.profile?.firstName ?? 'User';
  await sendPasswordChangedEmail(user.email, firstName);

  return { message: 'Password reset successful. Please log in with your new password.' };
}

// ─────────────────────────────────────────────
// SETUP 2FA
// ─────────────────────────────────────────────

export async function setupTwoFa(userId: string): Promise<ITwoFactorSetupResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: { select: { firstName: true, lastName: true } } },
  });

  if (user === null) throw new NotFoundError('User not found');

  if (user.twoFactorEnabled) {
    throw new ConflictError('Two-factor authentication is already enabled');
  }

  // Generate TOTP secret
  const secret = generateSecret();
  const serviceName = 'CareerArch';
  const otpAuthUrl = generateURI({
    issuer: serviceName,
    label: user.email,
    secret,
  });

  // Generate QR code as data URL
  const qrCodeUrl = await qrcode.toDataURL(otpAuthUrl);

  // Store secret temporarily (not yet enabled — user must verify first)
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret },
  });

  // Generate backup codes
  const backupCodes = generateBackupCodes();

  return {
    qrCodeUrl,
    manualKey: secret,
    backupCodes,
  };
}

// ─────────────────────────────────────────────
// VERIFY & ENABLE 2FA
// ─────────────────────────────────────────────

export async function verifyAndEnableTwoFa(
  userId: string,
  otp: string,
): Promise<{ message: string; backupCodes: string[] }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: { select: { firstName: true } } },
  });

  if (user === null) throw new NotFoundError('User not found');

  if (user.twoFactorSecret === null) {
    throw new BadRequestError('Please initiate 2FA setup first');
  }

  if (user.twoFactorEnabled) {
    throw new ConflictError('Two-factor authentication is already enabled');
  }

  const isValid = verifySync({ token: otp, secret: user.twoFactorSecret }).valid;
  if (!isValid) {
    throw new BadRequestError('Invalid OTP. Please scan the QR code again and try.');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });

  const firstName = user.profile?.firstName ?? 'User';
  await sendTwoFaEnabledEmail(user.email, firstName);

  const backupCodes = generateBackupCodes();
  return { message: '2FA enabled successfully. Store your backup codes safely.', backupCodes };
}

// ─────────────────────────────────────────────
// DISABLE 2FA
// ─────────────────────────────────────────────

export async function disableTwoFa(
  userId: string,
  password: string,
  otp: string,
): Promise<{ message: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user === null) throw new NotFoundError('User not found');

  if (!user.twoFactorEnabled) {
    throw new BadRequestError('Two-factor authentication is not enabled');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new UnauthorizedError('Incorrect password');

  if (user.twoFactorSecret === null) throw new BadRequestError('2FA secret not found');

  const isOtpValid = verifySync({ token: otp, secret: user.twoFactorSecret }).valid;
  if (!isOtpValid) throw new UnauthorizedError('Invalid OTP code');

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });

  return { message: '2FA disabled successfully.' };
}

// ─────────────────────────────────────────────
// GET ME
// ─────────────────────────────────────────────

export async function getUserMe(userId: string): Promise<IUserAuthResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
      subscription: { select: { plan: true, status: true } },
    },
  });

  if (user === null) throw new NotFoundError('User not found');

  return mapUserToAuthResponse(user);
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function issueTokens(
  userId: string,
  role: 'USER',
  email: string,
  rememberMe: boolean,
  plan: string,
): Promise<ITokenPair> {
  const payload = { sub: userId, role, email, plan: plan as 'FREE' | 'BASIC' | 'PREMIUM' };

  const accessToken = generateAccessToken(payload);
  const refreshToken = rememberMe
    ? generateRefreshTokenRememberMe(payload)
    : generateRefreshToken(payload);

  const expiresAt = rememberMe ? getExpiryDate('30d') : getExpiryDate('7d');

  const hashedRefresh = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      id: uuidv4(),
      token: hashedRefresh,
      userId,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

type UserWithRelations = Awaited<ReturnType<typeof prisma.user.findUnique>> & {
  profile: { firstName: string; lastName: string; avatarUrl: string | null } | null;
  subscription: { plan: string; status: string } | null;
};

function mapUserToAuthResponse(user: NonNullable<UserWithRelations>): IUserAuthResponse {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    profile:
      user.profile !== null
        ? {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            avatarUrl: user.profile.avatarUrl,
          }
        : null,
    subscription:
      user.subscription !== null
        ? {
            plan: user.subscription.plan as 'FREE' | 'BASIC' | 'PREMIUM',
            status: user.subscription.status,
          }
        : null,
  };
}

function generateBackupCodes(count = 8): string[] {
  return Array.from(
    { length: count },
    () => `${generateSecureToken(4).toUpperCase()}-${generateSecureToken(4).toUpperCase()}`,
  );
}
