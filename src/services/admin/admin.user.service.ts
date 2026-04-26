/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable no-nested-ternary */
import { prisma } from '@config/database';
import { BadRequestError, ForbiddenError, NotFoundError } from '@utils/apiError';
import { buildPaginationMeta } from '@utils/pagination';

import { extractPagination } from '@/utils/queryBuilder';

import type { Prisma, SubscriptionPlan } from '@prisma/client';
import type { AdminListUsersQuery } from '@validations/user.validation';

// ── Response types ─────────────────────────────────────────────────────────

export interface IAdminUserListItem {
  id: string;
  email: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  profile: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  subscription: {
    plan: string;
  } | null;
}

export interface IAdminUserDetail extends IAdminUserListItem {
  role: string;
  twoFactorEnabled: boolean;
  updatedAt: Date;
  profile: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    resumeUrl: string | null;
    phone: string | null;
    headline: string | null;
    location: string | null;
    skills: string[];
    experienceYears: number;
  } | null;
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: Date | null;
  } | null;
  _count: {
    applications: number;
  };
}

export interface IAdminUserStatusResponse {
  id: string;
  email: string;
  isActive: boolean;
}

// ── LIST USERS ─────────────────────────────────────────────────────────────

export async function listUsers(query: AdminListUsersQuery): Promise<{
  users: IAdminUserListItem[];
  meta: ReturnType<typeof buildPaginationMeta>;
}> {
  const { search, isActive, isEmailVerified, plan, sortBy, sortOrder } = query;

  const { limit, page, skip } = extractPagination(query as unknown as Record<string, unknown>);

  // Build `where` dynamically
  const where: Prisma.UserWhereInput = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (isEmailVerified !== undefined) {
    where.isEmailVerified = isEmailVerified;
  }

  if (plan !== undefined) {
    where.subscription = { plan: plan as SubscriptionPlan };
  }

  if (search !== undefined && search.length > 0) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { profile: { firstName: { contains: search, mode: 'insensitive' } } },
      { profile: { lastName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  // Build `orderBy` — profile fields need a relation sort
  const direction: Prisma.SortOrder = sortOrder ?? 'desc';
  const orderBy: Prisma.UserOrderByWithRelationInput =
    sortBy === 'email'
      ? { email: direction }
      : sortBy === 'lastLoginAt'
        ? { lastLoginAt: direction }
        : { createdAt: direction };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        subscription: {
          select: { plan: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    meta: buildPaginationMeta(total, page, limit),
  };
}

// ── GET USER BY ID ─────────────────────────────────────────────────────────

export async function getUserById(id: string): Promise<IAdminUserDetail> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      isEmailVerified: true,
      twoFactorEnabled: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          avatarUrl: true,
          resumeUrl: true,
          phone: true,
          headline: true,
          location: true,
          skills: true,
          experienceYears: true,
        },
      },
      subscription: {
        select: { plan: true, status: true, currentPeriodEnd: true },
      },
      _count: {
        select: { applications: true },
      },
    },
  });

  if (user === null) throw new NotFoundError('User not found');

  return user;
}

// ── SUSPEND USER ───────────────────────────────────────────────────────────

export async function suspendUser(
  targetUserId: string,
  adminId: string,
): Promise<IAdminUserStatusResponse> {
  // Guard: admin cannot suspend themselves
  if (targetUserId === adminId) {
    throw new ForbiddenError('You cannot suspend your own account');
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, isActive: true },
  });

  if (user === null) throw new NotFoundError('User not found');

  if (!user.isActive) {
    throw new BadRequestError('User is already suspended');
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive: false },
  });

  // Revoke all active refresh tokens — forces logout on every device immediately
  await prisma.refreshToken.updateMany({
    where: { userId: targetUserId, isRevoked: false },
    data: { isRevoked: true },
  });

  return { id: user.id, email: user.email, isActive: false };
}

// ── ACTIVATE USER ──────────────────────────────────────────────────────────

export async function activateUser(
  targetUserId: string,
  adminId: string,
): Promise<IAdminUserStatusResponse> {
  // Guard: admin cannot activate themselves (they're already active)
  if (targetUserId === adminId) {
    throw new ForbiddenError('You cannot change the status of your own account');
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, isActive: true },
  });

  if (user === null) throw new NotFoundError('User not found');

  if (user.isActive) {
    throw new BadRequestError('User is already active');
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive: true },
  });

  // Note: we do NOT re-issue tokens — the user must log in again themselves.

  return { id: user.id, email: user.email, isActive: true };
}
