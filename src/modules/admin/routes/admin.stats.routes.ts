import * as AdminStatsController from '@modules/admin/controllers/admin.stats.controller';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { Router } from 'express';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

/**
 * @swagger
 * /admin/dashboard/stats:
 *   get:
 *     summary: Platform overview stats — users, orgs, jobs, revenue, incentives
 *     tags: [Admin Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats object
 */
router.get('/stats', asyncHandler(AdminStatsController.getDashboardStats));

/**
 * @swagger
 * /admin/dashboard/registration-chart:
 *   get:
 *     summary: User & org registration chart data, bucketed into 10 points
 *     tags: [Admin Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [30d, 2m, 3m, 6m, 1y, 2y, 3y, 5y]
 *         description: Defaults to 30d if omitted or invalid
 *     responses:
 *       200:
 *         description: 10 time buckets with users/orgs counts
 */
router.get('/registration-chart', asyncHandler(AdminStatsController.getRegistrationChart));

router.get('/revenue-trend', asyncHandler(AdminStatsController.getRevenueTrend));
router.get('/revenue-by-plan', asyncHandler(AdminStatsController.getRevenueByPlan));

export default router;
