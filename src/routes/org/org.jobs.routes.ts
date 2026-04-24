import * as JobController from '@controllers/org/org.jobs.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { validate } from '@middlewares/validate';
import { asyncHandler } from '@utils/asyncHandler';
import {
  createJobSchema,
  jobIdParamSchema,
  listDeletedJobsSchema,
  listOrgJobsSchema,
  updateJobSchema,
} from '@validations/jobs.validation';
import { Router } from 'express';

import { requireOrgReady } from '@/middlewares/requireOrgReady';

const router = Router();

// All routes in this file require ORGANIZATION auth
router.use(authenticate, authorize('ORGANIZATION'));

/**
 * @swagger
 * tags:
 *   name: Org Jobs
 *   description: Job management endpoints for Organizations
 */

// ── /org/jobs/deleted must be declared BEFORE /org/jobs/:id ───────────────
// Express matches routes in order — if :id is first, "deleted" is treated as an ID

/**
 * @swagger
 * /org/jobs/deleted:
 *   get:
 *     summary: List soft-deleted jobs (trash view)
 *     tags: [Org Jobs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Deleted jobs list with pagination meta
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden — not an organization
 */
router.get(
  '/deleted',
  validate(listDeletedJobsSchema),
  asyncHandler(JobController.listDeletedJobs),
);

/**
 * @swagger
 * /org/jobs:
 *   get:
 *     summary: List own jobs (paginated, filterable)
 *     tags: [Org Jobs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, CLOSED]
 *         description: Filter by status. ARCHIVED jobs are in /org/jobs/deleted.
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
 *           enum: [createdAt, publishedAt, title]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Paginated list of jobs
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', validate(listOrgJobsSchema), asyncHandler(JobController.listJobs));

/**
 * @swagger
 * /org/jobs:
 *   post:
 *     summary: Create a new job (starts as DRAFT)
 *     tags: [Org Jobs]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, jobType]
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 150
 *               description:
 *                 type: string
 *                 minLength: 50
 *                 description: TipTap HTML — sanitized server-side
 *               requirements:
 *                 type: string
 *               responsibilities:
 *                 type: string
 *               jobType:
 *                 type: string
 *                 enum: [FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE, REMOTE]
 *               location:
 *                 type: string
 *               isRemote:
 *                 type: boolean
 *                 default: false
 *               salaryMin:
 *                 type: number
 *               salaryMax:
 *                 type: number
 *               salaryCurrency:
 *                 type: string
 *                 default: USD
 *               experienceLevel:
 *                 type: string
 *                 enum: [Entry, Mid, Senior, Lead]
 *               skills:
 *                 type: array
 *                 items: { type: string }
 *                 maxItems: 20
 *               category:
 *                 type: string
 *               deadline:
 *                 type: string
 *                 format: date-time
 *               vacancies:
 *                 type: integer
 *                 default: 1
 *               requiredPlan:
 *                 type: string
 *                 enum: [FREE, BASIC, PREMIUM]
 *                 default: FREE
 *                 description: >
 *                   Minimum subscription plan required to apply.
 *                   [TODO FUTURE] Permission check for org plan gating — deferred.
 *     responses:
 *       201:
 *         description: Job created as DRAFT
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       403:
 *         description: Organization not approved yet
 */
router.post('/', validate(createJobSchema), requireOrgReady, asyncHandler(JobController.createJob));

/**
 * @swagger
 * /org/jobs/{id}:
 *   get:
 *     summary: Get a single job (org view — includes application count)
 *     tags: [Org Jobs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Job detail
 *       404:
 *         description: Job not found
 */
router.get('/:id', validate(jobIdParamSchema), asyncHandler(JobController.getJob));

/**
 * @swagger
 * /org/jobs/{id}:
 *   put:
 *     summary: Update a job (all fields optional — only provided fields change)
 *     tags: [Org Jobs]
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
 *             description: All fields are optional. Slug is never changed (SEO stability).
 *     responses:
 *       200:
 *         description: Job updated
 *       400:
 *         description: Cannot edit archived job
 *       404:
 *         description: Job not found
 */
router.put(
  '/:id',
  validate(updateJobSchema),
  requireOrgReady,
  asyncHandler(JobController.updateJob),
);

/**
 * @swagger
 * /org/jobs/{id}:
 *   delete:
 *     summary: Soft-delete a job (moves to trash, auto-purged after 30 days)
 *     tags: [Org Jobs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Job moved to trash
 *       400:
 *         description: Published jobs must be closed before deletion
 *       404:
 *         description: Job not found
 */
router.delete(
  '/:id',
  validate(jobIdParamSchema),
  requireOrgReady,
  asyncHandler(JobController.deleteJob),
);

/**
 * @swagger
 * /org/jobs/{id}/publish:
 *   patch:
 *     summary: Publish a DRAFT or CLOSED job
 *     tags: [Org Jobs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Job published
 *       400:
 *         description: Job already published or missing required fields
 *       403:
 *         description: Organization not approved
 *       404:
 *         description: Job not found
 */
router.patch(
  '/:id/publish',
  validate(jobIdParamSchema),
  requireOrgReady,
  asyncHandler(JobController.publishJob),
);

/**
 * @swagger
 * /org/jobs/{id}/close:
 *   patch:
 *     summary: Close a published job (stops new applications)
 *     tags: [Org Jobs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Job closed
 *       400:
 *         description: Job is not published
 *       404:
 *         description: Job not found
 */
router.patch(
  '/:id/close',
  validate(jobIdParamSchema),
  requireOrgReady,
  asyncHandler(JobController.closeJob),
);

/**
 * @swagger
 * /org/jobs/{id}/restore:
 *   patch:
 *     summary: Restore a soft-deleted job from trash (within 30-day window)
 *     tags: [Org Jobs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Job restored as CLOSED — review before re-publishing
 *       400:
 *         description: Restore window has expired
 *       404:
 *         description: Job not found in trash
 */
router.patch(
  '/:id/restore',
  validate(jobIdParamSchema),
  requireOrgReady,
  asyncHandler(JobController.restoreJob),
);

export default router;
