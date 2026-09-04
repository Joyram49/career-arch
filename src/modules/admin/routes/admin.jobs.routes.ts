import * as AdminJobsController from '@modules/admin/controllers/admin.jobs.controller';
import {
  adminListJobsSchema,
  archiveJobSchema,
  republishJobSchema,
  takedownJobSchema,
} from '@modules/admin/validations/admin.jobs.validation';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { Router } from 'express';

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
 *         name: jobType
 *         schema:
 *           type: string
 *           enum: [FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE, REMOTE]
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: orgId
 *         schema: { type: string, format: uuid }
 *         description: Filter by organization
 *       - in: query
 *         name: salaryMin
 *         schema: { type: number, default: 0 }
 *       - in: query
 *         name: salaryMax
 *         schema: { type: number, default: 10000000 }
 *       - in: query
 *         name: deadlineStatus
 *         schema:
 *           type: string
 *           enum: [active, expired, all]
 *           default: all
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
 *           enum: [createdAt, publishedAt, views, title, salaryMin, salaryMax]
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

/**
 * @swagger
 * /admin/jobs/{id}/republish:
 *   patch:
 *     summary: Republish a closed job (CLOSED → PUBLISHED)
 *     tags: [Admin Jobs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Job republished
 *       400:
 *         description: Job is not CLOSED, or its deadline has already passed
 */
router.patch(
  '/:id/republish',
  validate(republishJobSchema),
  asyncHandler(AdminJobsController.republishJob),
);

/**
 * @swagger
 * /admin/jobs/{id}/archive:
 *   patch:
 *     summary: Archive a closed job (soft delete — CLOSED → ARCHIVED, hard-deleted after 30 days)
 *     tags: [Admin Jobs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Job archived
 *       400:
 *         description: Job is not CLOSED, or already archived
 */
router.patch(
  '/:id/archive',
  validate(archiveJobSchema),
  asyncHandler(AdminJobsController.archiveJob),
);

export default router;
