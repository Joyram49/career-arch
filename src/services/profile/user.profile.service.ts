import { prisma } from '@config/database';
import { env } from '@config/env';
import { redis, RedisKeys } from '@config/redis';
import { type Role, type SubscriptionPlan, type SubscriptionStatus } from '@prisma/client';
import {
  deleteFromCloudinary,
  uploadAvatarToCloudinary,
  uploadResumeToCloudinary,
} from '@services/upload/upload.service';
import { BadRequestError, NotFoundError, UnauthorizedError } from '@utils/apiError';
import { extractJti, getTokenTtl, hashToken } from '@utils/token';
import bcrypt from 'bcryptjs';

import type { UpdateProfileInput } from '@validations/user.validation';

// ── Response types ─────────────────────────────────────────────────────────

export interface IUserProfileResponse {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
    resumeUrl: string | null;
    headline: string | null;
    summary: string | null;
    location: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    portfolioUrl: string | null;
    skills: string[];
    experienceYears: number;
  } | null;
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: Date | null;
  } | null;
}

interface IUserWithRelations {
  id: string;
  email: string;
  role: Role;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
    resumeUrl: string | null;
    headline: string | null;
    summary: string | null;
    location: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    portfolioUrl: string | null;
    skills: string[];
    experienceYears: number;
  } | null;
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
  } | null;
}

// ── GET PROFILE ────────────────────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<IUserProfileResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      subscription: {
        select: { plan: true, status: true, currentPeriodEnd: true },
      },
    },
  });

  if (user === null) throw new NotFoundError('User not found');

  return mapToProfileResponse(user);
}

// ── UPDATE PROFILE ─────────────────────────────────────────────────────────

export async function updateUserProfile(
  userId: string,
  data: UpdateProfileInput,
): Promise<IUserProfileResponse> {
  const exists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (exists === null) throw new NotFoundError('User not found');

  // Separate name fields from the rest — all live on UserProfile
  const { firstName, lastName, ...rest } = data;

  // Convert empty strings to null so the DB field is properly cleared
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    sanitized[key] = value === '' ? null : value;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      profile: {
        update: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...sanitized,
        },
      },
    },
    include: {
      profile: true,
      subscription: {
        select: { plan: true, status: true, currentPeriodEnd: true },
      },
    },
  });

  return mapToProfileResponse(updatedUser);
}

// ── UPLOAD AVATAR ──────────────────────────────────────────────────────────

export async function updateUserAvatar(
  userId: string,
  file: Express.Multer.File,
): Promise<{ avatarUrl: string }> {
  // Fetch existing avatar URL so we can clean up S3 after upload
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { avatarUrl: true },
  });

  const newAvatarUrl = await uploadAvatarToCloudinary(userId, file);

  await prisma.userProfile.update({
    where: { userId },
    data: { avatarUrl: newAvatarUrl },
  });

  // Delete old avatar from S3 — fire-and-forget, never fail the request
  if (profile?.avatarUrl != null) {
    void deleteFromCloudinary(profile.avatarUrl);
  }

  return { avatarUrl: newAvatarUrl };
}

// ── UPLOAD RESUME ──────────────────────────────────────────────────────────

export async function updateUserResume(
  userId: string,
  file: Express.Multer.File,
): Promise<{ resumeUrl: string }> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { resumeUrl: true },
  });

  const newResumeUrl = await uploadResumeToCloudinary(userId, file);

  await prisma.userProfile.update({
    where: { userId },
    data: { resumeUrl: newResumeUrl },
  });

  if (profile?.resumeUrl != null) {
    void deleteFromCloudinary(profile.resumeUrl);
  }

  return { resumeUrl: newResumeUrl };
}

// ── DELETE RESUME ──────────────────────────────────────────────────────────

export async function deleteUserResume(userId: string): Promise<{ message: string }> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { resumeUrl: true },
  });
  if (profile === null) {
    throw new BadRequestError('User not found');
  }

  if (profile.resumeUrl === null) {
    throw new BadRequestError('No resume found to delete');
  }

  await prisma.userProfile.update({
    where: { userId },
    data: { resumeUrl: null },
  });

  void deleteFromCloudinary(profile.resumeUrl);

  return { message: 'Resume deleted successfully' };
}

// ── CHANGE PASSWORD ────────────────────────────────────────────────────────

export async function changeUserPassword(
  userId: string,
  data: { currentPassword: string; newPassword: string },
  accessToken: string,
  refreshToken: string,
): Promise<{ message: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  if (user === null) throw new NotFoundError('User not found');

  const isValid = await bcrypt.compare(data.currentPassword, user.password);
  if (!isValid) throw new UnauthorizedError('Current password is incorrect');

  const hashed = await bcrypt.hash(data.newPassword, env.BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  // Blacklist current access token immediately
  const jti = extractJti(accessToken);
  const ttl = getTokenTtl(accessToken);
  if (jti !== null && ttl > 0) {
    await redis.setex(RedisKeys.blacklistToken(jti), ttl, '1');
  }

  // Revoke every refresh token for this user (forces re-login on all devices)
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });

  // Also explicitly revoke the provided refresh token (belt-and-suspenders)
  if (refreshToken.length > 0) {
    const hashedRefresh = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { token: hashedRefresh },
      data: { isRevoked: true },
    });
  }

  return { message: 'Password changed successfully. Please log in again on all devices.' };
}

// ── DEACTIVATE ACCOUNT ─────────────────────────────────────────────────────

export async function deactivateUserAccount(
  userId: string,
  password: string,
  accessToken: string,
): Promise<{ message: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  if (user === null) throw new NotFoundError('User not found');

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new UnauthorizedError('Incorrect password');

  // Soft delete — preserves data for audit / potential reactivation
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  // Revoke all active sessions
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });

  // Blacklist current access token
  const jti = extractJti(accessToken);
  const ttl = getTokenTtl(accessToken);
  if (jti !== null && ttl > 0) {
    await redis.setex(RedisKeys.blacklistToken(jti), ttl, '1');
  }

  return { message: 'Your account has been deactivated. We are sorry to see you go.' };
}

// ── Mapper ─────────────────────────────────────────────────────────────────

function mapToProfileResponse(user: IUserWithRelations): IUserProfileResponse {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    profile:
      user.profile !== null
        ? {
            id: user.profile.id,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            phone: user.profile.phone,
            avatarUrl: user.profile.avatarUrl,
            resumeUrl: user.profile.resumeUrl,
            headline: user.profile.headline,
            summary: user.profile.summary,
            location: user.profile.location,
            linkedinUrl: user.profile.linkedinUrl,
            githubUrl: user.profile.githubUrl,
            portfolioUrl: user.profile.portfolioUrl,
            skills: user.profile.skills,
            experienceYears: user.profile.experienceYears,
          }
        : null,
    subscription:
      user.subscription !== null
        ? {
            plan: user.subscription.plan,
            status: user.subscription.status,
            currentPeriodEnd: user.subscription.currentPeriodEnd,
          }
        : null,
  };
}
