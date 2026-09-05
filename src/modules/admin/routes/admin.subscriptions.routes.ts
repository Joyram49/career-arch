import * as AdminSubscriptionController from '@modules/admin/controllers/admin.subscriptions.controller';
import {
  adminListSubscriptionsSchema,
  adminRefundSchema,
  subscriptionIdParamSchema,
} from '@modules/admin/validations/admin.subscriptions.validation';
import { validate } from '@shared/middlewares/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { Router } from 'express';

const router = Router();

// ── Subscription Management ───────────────────────────────────────────────

/**
 * @swagger
 * /admin/subscriptions:
 *   get:
 *     summary: List all user subscriptions (paginated, filterable)
 *     tags: [Admin Subscriptions]
 *   - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by user email, first name, or last name
 */
router.get(
  '/',
  validate(adminListSubscriptionsSchema),
  asyncHandler(AdminSubscriptionController.listSubscriptions),
);

/**
 * @swagger
 * /admin/subscriptions/stats:
 *   get:
 *     summary: Subscription stats — MRR, counts per plan, past due
 *     tags: [Admin Subscriptions]
 */
router.get('/stats', asyncHandler(AdminSubscriptionController.getSubscriptionStats));

/**
 * @swagger
 * /admin/subscriptions/{id}:
 *   get:
 *     summary: Get single subscription detail
 *     tags: [Admin Subscriptions]
 */
router.get(
  '/:id',
  validate(subscriptionIdParamSchema),
  asyncHandler(AdminSubscriptionController.getSubscription),
);

/**
 * @swagger
 * /admin/subscriptions/{id}/cancel:
 *   post:
 *     summary: Force-cancel a user subscription (immediate)
 *     tags: [Admin Subscriptions]
 */
router.post(
  '/:id/cancel',
  validate(subscriptionIdParamSchema),
  asyncHandler(AdminSubscriptionController.forceCancel),
);

/**
 * @swagger
 * /admin/subscriptions/{id}/refund:
 *   post:
 *     summary: Refund last paid invoice for a subscription
 *     tags: [Admin Subscriptions]
 */
router.post(
  '/:id/refund',
  validate(adminRefundSchema),
  asyncHandler(AdminSubscriptionController.refundLastInvoice),
);

export default router;
