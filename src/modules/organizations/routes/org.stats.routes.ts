import * as OrgStatsController from '@modules/organizations/controllers/org.stats.controller';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { Router } from 'express';

import { orgJobsPerformanceQuerySchema } from '../validations/org.stats.validation';

const router = Router();

// All dashboard routes require a valid ORGANIZATION token
router.use(authenticate, authorize('ORGANIZATION'));

/**
 * @swagger
 * /org/dashboard/stats:
 *   get:
 *     summary: Get organization dashboard overview stats
 *     tags: [Organization Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Stats retrieved successfully
 */
router.get('/stats', asyncHandler(OrgStatsController.getDashboardStats));

/**
 * @swagger
 * /org/dashboard/jobs-performance:
 *   get:
 *     summary: Get a paginated, most-recent-first job performance list
 *     tags: [Organization Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 */
router.get(
  '/jobs-performance',
  validate(orgJobsPerformanceQuerySchema),
  asyncHandler(OrgStatsController.getJobsPerformance),
);

/**
 * @swagger
 * /org/dashboard/recent-applications:
 *   get:
 *     summary: Get the most recent applications across the org's jobs
 *     tags: [Organization Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 */
router.get('/recent-applications', asyncHandler(OrgStatsController.getRecentApplications));

export default router;
