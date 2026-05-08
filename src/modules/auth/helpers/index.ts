import { v4 as uuidv4 } from 'uuid';

import { prisma } from '@/config/database';
import {
  generateAccessToken,
  generateRefreshToken,
  generateRefreshTokenRememberMe,
  generateSecureToken,
  getExpiryDate,
  hashToken,
} from '@/shared/utils/token';
import { type IOrgAuthResponse, type ITokenPair, type IUserAuthResponse } from '@/types';

import { type OrgWithProfile } from '../types';

export async function issueOrgTokens(
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

export function mapOrgToAuthResponse(org: OrgWithProfile): IOrgAuthResponse {
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

export function generateBackupCodes(count = 8): string[] {
  return Array.from(
    { length: count },
    () => `${generateSecureToken(4).toUpperCase()}-${generateSecureToken(4).toUpperCase()}`,
  );
}

export async function issueTokens(
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

export function mapUserToAuthResponse(user: NonNullable<UserWithRelations>): IUserAuthResponse {
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
