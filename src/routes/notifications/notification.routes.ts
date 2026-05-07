import * as NotificationController from '@controllers/notifications/notification.controller';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import {
  listNotificationsSchema,
  notificationIdParamSchema,
} from '@validations/notification.validation';
import { Router } from 'express';

const router = Router();

// All notification routes require a valid session (any role)
router.use(authenticate, authorize('USER', 'ORGANIZATION', 'ADMIN'));

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get notifications for the authenticated user/org/admin (paginated)
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by read status
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated notifications + unread count
 */
router.get(
  '/',
  validate(listNotificationsSchema),
  asyncHandler(NotificationController.listNotifications),
);

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all unread notifications as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Count of notifications marked as read
 */
// NOTE: /read-all MUST be declared before /:id to prevent Express
// treating "read-all" as a UUID param — same pattern as /org/jobs/deleted
router.patch('/read-all', asyncHandler(NotificationController.markAllAsRead));

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
router.patch(
  '/:id/read',
  validate(notificationIdParamSchema),
  asyncHandler(NotificationController.markAsRead),
);

export default router;
