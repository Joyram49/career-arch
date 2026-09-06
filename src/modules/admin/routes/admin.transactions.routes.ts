import * as AdminTransactionsController from '@modules/admin/controllers/admin.transactions.controller';
import {
  adminListTransactionsSchema,
  transactionIdParamSchema,
} from '@modules/admin/validations/admin.transactions.validation';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { Router } from 'express';

const router = Router();

// All admin transaction routes require a valid ADMIN token
router.use(authenticate, authorize('ADMIN'));

/**
 * @swagger
 * /admin/transactions:
 *   get:
 *     summary: List all platform transactions (paginated + filterable)
 *     tags: [Admin Transactions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by user/org name, email, or payment description
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [SUBSCRIPTION, REFUND, INCENTIVE, OTHER]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, SUCCEEDED, FAILED, REFUNDED]
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, amount], default: createdAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 */
router.get(
  '/',
  validate(adminListTransactionsSchema),
  asyncHandler(AdminTransactionsController.listTransactions),
);

/**
 * @swagger
 * /admin/transactions/stats:
 *   get:
 *     summary: Transaction stats — monthly/today revenue, refunds, failures, pending
 *     tags: [Admin Transactions]
 *     security:
 *       - BearerAuth: []
 */
// NOTE: /stats and /chart declared before any future /:id route.
router.get('/stats', asyncHandler(AdminTransactionsController.getTransactionStats));

/**
 * @swagger
 * /admin/transactions/chart:
 *   get:
 *     summary: Revenue timeline — subscriptions + incentives, bucketed by range
 *     tags: [Admin Transactions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [7w, 30d, 2m, 3m, 6m, 1y, 2y, 3y, 5y]
 *         description: Defaults to 30d if omitted or invalid
 */
router.get('/chart', asyncHandler(AdminTransactionsController.getRevenueTimeline));

/**
 * @swagger
 * /admin/transactions/{id}:
 *   get:
 *     summary: Get single transaction detail (includes raw metadata)
 *     tags: [Admin Transactions]
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
  validate(transactionIdParamSchema),
  asyncHandler(AdminTransactionsController.getTransaction),
);

export default router;
