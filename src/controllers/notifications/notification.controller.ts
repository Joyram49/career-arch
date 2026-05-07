import * as NotificationService from '@services/notifications/notification.service';
import { sendSuccess } from '@utils/apiResponse';

import type { IAuthenticatedRequest } from '@app-types/index';
import type { ListNotificationsQuery } from '@validations/notification.validation';
import type { Request, Response } from 'express';

// ── GET /notifications ────────────────────────────────────────────────────

export async function listNotifications(req: Request, res: Response): Promise<Response> {
  const { sub, role } = (req as IAuthenticatedRequest).user;
  const query = req.query as unknown as ListNotificationsQuery;

  const { notifications, meta, unreadCount } = await NotificationService.listNotifications(
    sub,
    role,
    query,
  );

  return sendSuccess(res, { notifications, unreadCount }, 'Notifications retrieved', 200, meta);
}

// ── PATCH /notifications/:id/read ─────────────────────────────────────────

export async function markAsRead(req: Request, res: Response): Promise<Response> {
  const { sub, role } = (req as IAuthenticatedRequest).user;
  const { id } = req.params as { id: string };

  const notification = await NotificationService.markNotificationRead(sub, role, id);

  return sendSuccess(res, { notification }, 'Notification marked as read');
}

// ── PATCH /notifications/read-all ─────────────────────────────────────────

export async function markAllAsRead(req: Request, res: Response): Promise<Response> {
  const { sub, role } = (req as IAuthenticatedRequest).user;

  const result = await NotificationService.markAllNotificationsRead(sub, role);

  return sendSuccess(res, null, `${result.count} notification(s) marked as read`);
}
