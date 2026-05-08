import * as AdminIncentiveController from '@modules/admin/controllers/admin.incentives.controller';
import {
  adminListIncentivesSchema,
  incentiveIdParamSchema,
  resolveDisputeSchema,
  waiveIncentiveSchema,
} from '@modules/incentives/validations/incentive.validation';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { Router } from 'express';

const router = Router();

// All admin incentive routes require a valid ADMIN token
router.use(authenticate, authorize('ADMIN'));

/**
 * @swagger
 * /admin/incentives:
 *   get:
 *     summary: List all platform incentives (paginated + filterable)
 *     tags: [Admin Incentives]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, WAIVED, DISPUTED, OVERDUE]
 *       - in: query
 *         name: orgId
 *         schema: { type: string, format: uuid }
 *         description: Filter by organization
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, dueAt, paidAt]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 */
router.get(
  '/',
  validate(adminListIncentivesSchema),
  asyncHandler(AdminIncentiveController.listIncentives),
);

/**
 * @swagger
 * /admin/incentives/stats:
 *   get:
 *     summary: Platform incentive stats — total collected, pending, overdue, disputed
 *     tags: [Admin Incentives]
 *     security:
 *       - BearerAuth: []
 */
// NOTE: /stats must be declared BEFORE /:id — otherwise Express treats "stats" as an ID
router.get('/stats', asyncHandler(AdminIncentiveController.getStats));

/**
 * @swagger
 * /admin/incentives/{id}:
 *   get:
 *     summary: Get single incentive detail (any org)
 *     tags: [Admin Incentives]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 */
router.get(
  '/:id',
  validate(incentiveIdParamSchema),
  asyncHandler(AdminIncentiveController.getIncentive),
);

/**
 * @swagger
 * /admin/incentives/{id}/waive:
 *   post:
 *     summary: Waive a hiring incentive (any non-PAID status)
 *     tags: [Admin Incentives]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 */
router.post(
  '/:id/waive',
  validate(waiveIncentiveSchema),
  asyncHandler(AdminIncentiveController.waiveIncentive),
);

/**
 * @swagger
 * /admin/incentives/{id}/resolve-dispute:
 *   post:
 *     summary: Resolve a DISPUTED incentive — collect payment or waive
 *     tags: [Admin Incentives]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resolution]
 *             properties:
 *               resolution:
 *                 type: string
 *                 enum: [collect, waive]
 *               note:
 *                 type: string
 *                 maxLength: 500
 */
router.post(
  '/:id/resolve-dispute',
  validate(resolveDisputeSchema),
  asyncHandler(AdminIncentiveController.resolveDispute),
);

export default router;
