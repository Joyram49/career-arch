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

export default router;
