import { z } from 'zod';

// ── List notifications ─────────────────────────────────────────────────────

export const listNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    isRead: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  }),
});

// ── Notification ID param ──────────────────────────────────────────────────

export const notificationIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid notification ID'),
  }),
});

// ── Inferred types ─────────────────────────────────────────────────────────

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>['query'];
export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>['params'];
