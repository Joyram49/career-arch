import * as OrgIncentiveController from '@modules/incentives/controllers/org.incentive.controller';
import {
  disputeIncentiveSchema,
  incentiveIdParamSchema,
  listOrgIncentivesSchema,
} from '@modules/incentives/validations/incentive.validation';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { Router } from 'express';

const router = Router();

// All org incentive routes require a valid ORGANIZATION token
router.use(authenticate, authorize('ORGANIZATION'));

/**
 * @swagger
 * /org/incentives:
 *   get:
 *     summary: List own hiring incentives (paginated + filterable by status)
 *     tags: [Org Incentives]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, WAIVED, DISPUTED, OVERDUE]
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
 *     responses:
 *       200:
 *         description: Paginated incentive list
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/',
  validate(listOrgIncentivesSchema),
  asyncHandler(OrgIncentiveController.listIncentives),
);

/**
 * @swagger
 * /org/incentives/{id}:
 *   get:
 *     summary: Get a single incentive detail
 *     tags: [Org Incentives]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Incentive detail
 *       404:
 *         description: Incentive not found
 */
router.get(
  '/:id',
  validate(incentiveIdParamSchema),
  asyncHandler(OrgIncentiveController.getIncentive),
);

/**
 * @swagger
 * /org/incentives/{id}/pay:
 *   post:
 *     summary: Pay a hiring incentive via saved card (Stripe off-session charge)
 *     tags: [Org Incentives]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payment successful
 *       400:
 *         description: Already paid / waived / disputed / no payment method
 *       402:
 *         description: Card declined or payment failed
 *       404:
 *         description: Incentive not found
 */
router.post(
  '/:id/pay',
  validate(incentiveIdParamSchema),
  asyncHandler(OrgIncentiveController.payIncentive),
);

/**
 * @swagger
 * /org/incentives/{id}/dispute:
 *   post:
 *     summary: File a dispute on a PENDING or OVERDUE incentive
 *     tags: [Org Incentives]
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
 *                 minLength: 20
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Dispute filed successfully
 *       400:
 *         description: Cannot dispute — already paid / waived / already disputed
 *       404:
 *         description: Incentive not found
 */
router.post(
  '/:id/dispute',
  validate(disputeIncentiveSchema),
  asyncHandler(OrgIncentiveController.disputeIncentive),
);

export default router;
