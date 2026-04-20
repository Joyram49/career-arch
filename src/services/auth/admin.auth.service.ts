import { prisma } from '@config/database';
import { redis, RedisKeys } from '@config/redis';
import { NotFoundError, UnauthorizedError } from '@utils/apiError';
import {
  extractJti,
  generateAccessToken,
  generateRefreshToken,
  getExpiryDate,
  getTokenTtl,
  hashToken,
  verifyRefreshToken,
} from '@utils/token';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import type { IAdminAuthResponse, ITokenPair } from '@app-types/index';

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────

export async function loginAdmin(data: {
  email: string;
  password: string;
}): Promise<{ tokens: ITokenPair; admin: IAdminAuthResponse }> {
  const admin = await prisma.admin.findUnique({
    where: { email: data.email },
  });

  if (admin === null) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(data.password, admin.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const payload = { sub: admin.id, role: 'ADMIN' as const, email: admin.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Admins use DB-stored refresh tokens (no org/user FK — stored with null)
  await prisma.refreshToken.create({
    data: {
      id: uuidv4(),
      token: hashToken(refreshToken),
      expiresAt: getExpiryDate('7d'),
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

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────

export async function logoutAdmin(accessToken: string, refreshToken: string): Promise<void> {
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

export async function refreshAdminToken(rawRefreshToken: string): Promise<ITokenPair> {
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
    throw new UnauthorizedError('Session expired. Please log in again.');
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { isRevoked: true },
  });

  const admin = await prisma.admin.findUnique({
    where: { id: decoded.sub },
  });

  if (admin === null) {
    throw new UnauthorizedError('Admin account not found');
  }

  const payload = { sub: admin.id, role: 'ADMIN' as const, email: admin.email };
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      id: uuidv4(),
      token: hashToken(newRefreshToken),
      expiresAt: getExpiryDate('7d'),
    },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

// ─────────────────────────────────────────────
// GET ME
// ─────────────────────────────────────────────

export async function getAdminMe(adminId: string): Promise<IAdminAuthResponse> {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
  });

  if (admin === null) throw new NotFoundError('Admin not found');

  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    name: admin.name,
  };
}
