import * as AdminJobsController from '@controllers/admin/admin.jobs.controller';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { Router } from 'express';

import { adminListJobsSchema, takedownJobSchema } from '@/validations/admin.jobs.validation';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

/**
 * @swagger
 * /admin/jobs:
 *   get:
 *     summary: List all platform jobs (paginated, filterable)
 *     tags: [Admin Jobs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by title, category, or company name
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, CLOSED, ARCHIVED]
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
 *           enum: [createdAt, publishedAt, views, title]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 */
router.get('/', validate(adminListJobsSchema), asyncHandler(AdminJobsController.listJobs));

/**
 * @swagger
 * /admin/jobs/{id}/takedown:
 *   patch:
 *     summary: Force-close a job (takedown — sets status to CLOSED)
 *     tags: [Admin Jobs]
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
router.patch(
  '/:id/takedown',
  validate(takedownJobSchema),
  asyncHandler(AdminJobsController.takedownJob),
);

export default router;
