import { prisma } from '@config/database';
import { env } from '@config/env';
import { redis, RedisExpiry, RedisKeys } from '@config/redis';
import {
  sendOrgVerificationEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendTwoFaEnabledEmail,
} from '@services/email.service';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '@utils/apiError';
import {
  extractJti,
  generateAccessToken,
  generateRefreshToken,
  generateRefreshTokenRememberMe,
  generateSecureToken,
  getExpiryDate,
  getTokenTtl,
  hashToken,
  verifyRefreshToken,
} from '@utils/token';
import bcrypt from 'bcryptjs';
import { generateSecret, generateURI, verifySync } from 'otplib';
import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

import type { IOrgAuthResponse, ITokenPair, ITwoFactorSetupResponse } from '@app-types/index';
import type { Role } from '@prisma/client';

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────

export async function registerOrg(data: {
  email: string;
  password: string;
  companyName: string;
}): Promise<{ message: string }> {
  const existing = await prisma.organization.findUnique({
    where: { email: data.email },
    select: { id: true },
  });

  if (existing !== null) {
    throw new ConflictError('An organization with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);
  const rawToken = generateSecureToken();
  const hashedToken = hashToken(rawToken);
  const verifyExpiry = getExpiryDate('24h');

  await prisma.organization.create({
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

  const verifyUrl = `${env.FRONTEND_URL}/org/verify-email?token=${rawToken}`;
  await sendOrgVerificationEmail(data.email, data.companyName, verifyUrl);

  return {
    message:
      'Organization registered successfully. Please verify your email. Your account will be reviewed and approved by our team.',
  };
}

// ─────────────────────────────────────────────
// VERIFY EMAIL
// ─────────────────────────────────────────────

export async function verifyOrgEmail(token: string): Promise<{ message: string }> {
  const hashedToken = hashToken(token);

  const org = await prisma.organization.findFirst({
    where: {
      emailVerifyToken: hashedToken,
      emailVerifyExpiry: { gt: new Date() },
    },
    select: { id: true, isEmailVerified: true },
  });

  if (org === null) {
    throw new BadRequestError('Invalid or expired verification token');
  }

  if (org.isEmailVerified) {
    return { message: 'Email is already verified' };
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      isEmailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiry: null,
    },
  });

  return { message: 'Email verified successfully. Awaiting admin approval to post jobs.' };
}

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────

export interface IOrgLoginResult {
  requires2FA?: boolean;
  tempToken?: string;
  tokens?: ITokenPair;
  organization?: IOrgAuthResponse;
}

export async function loginOrg(data: {
  email: string;
  password: string;
  rememberMe: boolean;
}): Promise<IOrgLoginResult> {
  const org = await prisma.organization.findUnique({
    where: { email: data.email },
    include: {
      profile: { select: { companyName: true, logoUrl: true } },
    },
  });

  if (org === null) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!org.isActive) {
    throw new ForbiddenError(
      'This organization account has been suspended. Please contact support.',
    );
  }

  const isPasswordValid = await bcrypt.compare(data.password, org.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!org.isEmailVerified) {
    throw new ForbiddenError('Please verify your email address before logging in.');
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: { lastLoginAt: new Date() },
  });

  // 2FA check
  if (org.twoFactorEnabled) {
    const tempToken = generateAccessToken({
      sub: org.id,
      role: 'ORGANIZATION',
      email: org.email,
    });

    await redis.setex(RedisKeys.twoFaTempToken(org.id), RedisExpiry.TWO_FA_TEMP, '1');

    return { requires2FA: true, tempToken };
  }

  const tokens = await issueOrgTokens(org.id, org.email, data.rememberMe);

  return { tokens, organization: mapOrgToAuthResponse(org) };
}

// ─────────────────────────────────────────────
// VALIDATE 2FA
// ─────────────────────────────────────────────

export async function validateOrgTwoFa(data: {
  tempToken: string;
  otp: string;
}): Promise<{ tokens: ITokenPair; organization: IOrgAuthResponse }> {
  const { verifyAccessToken } = await import('@utils/token');

  let decoded;
  try {
    decoded = verifyAccessToken(data.tempToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired session. Please log in again.');
  }

  const pending = await redis.get(RedisKeys.twoFaTempToken(decoded.sub));
  if (pending === null) {
    throw new UnauthorizedError('2FA session expired. Please log in again.');
  }

  const org = await prisma.organization.findUnique({
    where: { id: decoded.sub },
    include: { profile: { select: { companyName: true, logoUrl: true } } },
  });

  if (org?.twoFactorSecret == null) {
    throw new UnauthorizedError('Invalid session');
  }

  const result = verifySync({
    token: data.otp,
    secret: org.twoFactorSecret,
  });
  const isValid = result.valid;

  if (!isValid) {
    throw new UnauthorizedError('Invalid OTP code. Please try again.');
  }

  await redis.del(RedisKeys.twoFaTempToken(decoded.sub));

  const tokens = await issueOrgTokens(org.id, org.email, false);

  return { tokens, organization: mapOrgToAuthResponse(org) };
}

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────

export async function logoutOrg(accessToken: string, refreshToken: string): Promise<void> {
  const jti = extractJti(accessToken);
  const ttl = getTokenTtl(accessToken);

  if (jti !== null && ttl > 0) {
    await redis.setex(RedisKeys.blacklistToken(jti), ttl, '1');
  }

  const hashedRefresh = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { token: hashedRefresh, isRevoked: false },
    data: { isRevoked: true },
  });
}

// ─────────────────────────────────────────────
// REFRESH TOKEN
// ─────────────────────────────────────────────

export async function refreshOrgToken(rawRefreshToken: string): Promise<ITokenPair> {
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
    await prisma.refreshToken.updateMany({
      where: { orgId: decoded.sub, isRevoked: false },
      data: { isRevoked: true },
    });
    throw new UnauthorizedError('Session expired or revoked. Please log in again.');
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { isRevoked: true },
  });

  const org = await prisma.organization.findUnique({
    where: { id: decoded.sub },
    select: { id: true, email: true, isActive: true },
  });

  if (org?.isActive !== true) {
    throw new UnauthorizedError('Account not found or suspended');
  }

  return issueOrgTokens(org.id, org.email, false);
}

// ─────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────

export async function forgotOrgPassword(email: string): Promise<{ message: string }> {
  const genericResponse = {
    message: 'If an account with that email exists, a password reset link has been sent.',
  };

  const org = await prisma.organization.findUnique({
    where: { email },
    include: { profile: { select: { companyName: true } } },
  });

  if (org === null) return genericResponse;

  const rawToken = generateSecureToken();
  const hashedToken = hashToken(rawToken);
  const resetExpiry = getExpiryDate('1h');

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetExpiry: resetExpiry,
    },
  });

  const resetUrl = `${env.FRONTEND_URL}/org/reset-password?token=${rawToken}`;
  const name = org.profile?.companyName ?? 'Organization';
  await sendPasswordResetEmail(email, name, resetUrl);

  return genericResponse;
}

// ─────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────

export async function resetOrgPassword(data: {
  token: string;
  newPassword: string;
}): Promise<{ message: string }> {
  const hashedToken = hashToken(data.token);

  const org = await prisma.organization.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpiry: { gt: new Date() },
    },
    include: { profile: { select: { companyName: true } } },
  });

  if (org === null) {
    throw new BadRequestError('Invalid or expired reset token. Please request a new one.');
  }

  const hashedPassword = await bcrypt.hash(data.newPassword, env.BCRYPT_ROUNDS);

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  await prisma.refreshToken.updateMany({
    where: { orgId: org.id, isRevoked: false },
    data: { isRevoked: true },
  });

  const name = org.profile?.companyName ?? 'Organization';
  await sendPasswordChangedEmail(org.email, name);

  return { message: 'Password reset successful. Please log in with your new password.' };
}

// ─────────────────────────────────────────────
// SETUP 2FA
// ─────────────────────────────────────────────

export async function setupOrgTwoFa(orgId: string): Promise<ITwoFactorSetupResponse> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { profile: { select: { companyName: true } } },
  });

  if (org === null) throw new NotFoundError('Organization not found');
  if (org.twoFactorEnabled) {
    throw new ConflictError('Two-factor authentication is already enabled');
  }

  const secret = generateSecret();
  const otpAuthUrl = generateURI({
    issuer: 'CareerArch',
    label: org.email,
    secret,
  });
  const qrCodeUrl = await qrcode.toDataURL(otpAuthUrl);

  await prisma.organization.update({
    where: { id: orgId },
    data: { twoFactorSecret: secret },
  });

  const backupCodes = generateBackupCodes();

  return { qrCodeUrl, manualKey: secret, backupCodes };
}

// ─────────────────────────────────────────────
// VERIFY & ENABLE 2FA
// ─────────────────────────────────────────────

export async function verifyAndEnableOrgTwoFa(
  orgId: string,
  otp: string,
): Promise<{ message: string; backupCodes: string[] }> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });

  if (org === null) throw new NotFoundError('Organization not found');
  if (org.twoFactorSecret === null) {
    throw new BadRequestError('Please initiate 2FA setup first');
  }
  if (org.twoFactorEnabled) {
    throw new ConflictError('Two-factor authentication is already enabled');
  }

  const isValid = verifySync({ token: otp, secret: org.twoFactorSecret }).valid;
  if (!isValid) {
    throw new BadRequestError('Invalid OTP. Please try again.');
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: { twoFactorEnabled: true },
  });

  await sendTwoFaEnabledEmail(org.email, 'Team');

  const backupCodes = generateBackupCodes();
  return {
    message: '2FA enabled successfully. Store your backup codes safely.',
    backupCodes,
  };
}

// ─────────────────────────────────────────────
// GET ME
// ─────────────────────────────────────────────

export async function getOrgMe(orgId: string): Promise<IOrgAuthResponse> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      profile: { select: { companyName: true, logoUrl: true } },
    },
  });

  if (org === null) throw new NotFoundError('Organization not found');

  return mapOrgToAuthResponse(org);
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function issueOrgTokens(
  orgId: string,
  email: string,
  rememberMe: boolean,
): Promise<ITokenPair> {
  const payload = { sub: orgId, role: 'ORGANIZATION' as const, email };

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
      orgId,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

type OrgWithProfile = {
  id: string;
  email: string;
  role: Role;
  isEmailVerified: boolean;
  isApproved: boolean;
  twoFactorEnabled: boolean;
  profile: { companyName: string; logoUrl: string | null } | null;
};

function mapOrgToAuthResponse(org: OrgWithProfile): IOrgAuthResponse {
  return {
    id: org.id,
    email: org.email,
    role: org.role,
    isEmailVerified: org.isEmailVerified,
    isApproved: org.isApproved,
    twoFactorEnabled: org.twoFactorEnabled,
    profile:
      org.profile !== null
        ? { companyName: org.profile.companyName, logoUrl: org.profile.logoUrl }
        : null,
  };
}

function generateBackupCodes(count = 8): string[] {
  return Array.from(
    { length: count },
    () => `${generateSecureToken(4).toUpperCase()}-${generateSecureToken(4).toUpperCase()}`,
  );
}
