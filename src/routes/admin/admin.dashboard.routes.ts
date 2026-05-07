import * as AdminStatsController from '@controllers/admin/admin.stats.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { asyncHandler } from '@utils/asyncHandler';
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
