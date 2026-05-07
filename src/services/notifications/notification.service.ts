/* eslint-disable no-nested-ternary */
import { prisma } from '@config/database';
import { NotFoundError } from '@utils/apiError';
import { buildPaginationMeta } from '@utils/pagination';
import { extractPagination } from '@utils/queryBuilder';

import type { Role } from '@prisma/client';
import type { ListNotificationsQuery } from '@validations/notification.validation';

// ─────────────────────────────────────────────
// RESPONSE TYPE
// ─────────────────────────────────────────────

export interface INotificationResponse {
  id: string;
  recipientRole: Role;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: Date;
}

// ─────────────────────────────────────────────
// LIST NOTIFICATIONS
// ─────────────────────────────────────────────

export async function listNotifications(
  recipientId: string,
  role: Role,
  query: ListNotificationsQuery,
): Promise<{
  notifications: INotificationResponse[];
  meta: ReturnType<typeof buildPaginationMeta>;
  unreadCount: number;
}> {
  const { page, limit, skip } = extractPagination(query);

  // Build recipient filter based on role
  const recipientFilter =
    role === 'USER'
      ? { userId: recipientId }
      : role === 'ORGANIZATION'
        ? { orgId: recipientId }
        : { recipientRole: 'ADMIN' as Role }; // Admin sees platform-wide admin notifications

  const where = {
    ...recipientFilter,
    ...(query.isRead !== undefined && { isRead: query.isRead }),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        recipientRole: true,
        title: true,
        message: true,
        isRead: true,
        link: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { ...recipientFilter, isRead: false },
    }),
  ]);

  return {
    notifications,
    meta: buildPaginationMeta(total, page, limit),
    unreadCount,
  };
}

// ─────────────────────────────────────────────
// MARK SINGLE AS READ
// ─────────────────────────────────────────────

export async function markNotificationRead(
  recipientId: string,
  role: Role,
  notificationId: string,
): Promise<INotificationResponse> {
  const recipientFilter =
    role === 'USER'
      ? { userId: recipientId }
      : role === 'ORGANIZATION'
        ? { orgId: recipientId }
        : { recipientRole: 'ADMIN' as Role };

  // Verify ownership before updating
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, ...recipientFilter },
    select: { id: true },
  });

  if (existing === null) {
    throw new NotFoundError('Notification not found');
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
    select: {
      id: true,
      recipientRole: true,
      title: true,
      message: true,
      isRead: true,
      link: true,
      createdAt: true,
    },
  });

  return updated;
}

// ─────────────────────────────────────────────
// MARK ALL AS READ
// ─────────────────────────────────────────────

export async function markAllNotificationsRead(
  recipientId: string,
  role: Role,
): Promise<{ count: number }> {
  const recipientFilter =
    role === 'USER'
      ? { userId: recipientId }
      : role === 'ORGANIZATION'
        ? { orgId: recipientId }
        : { recipientRole: 'ADMIN' as Role };

  const result = await prisma.notification.updateMany({
    where: { ...recipientFilter, isRead: false },
    data: { isRead: true },
  });

  return { count: result.count };
}
