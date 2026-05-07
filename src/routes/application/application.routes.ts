import * as UserApplicationController from '@controllers/application/user.application.controller';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { checkApplyLimit } from '@shared/middlewares/checkApplyLimit';
import { checkJobPlan } from '@shared/middlewares/checkJobPlan';
import { validate } from '@shared/middlewares/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import {
  applicationIdParamSchema,
  createApplicationSchema,
  listUserApplicationsSchema,
} from '@validations/application.validation';
import { Router } from 'express';

const router = Router();

// All application routes require a verified USER session
router.use(authenticate, authorize('USER'));

/**
 * @swagger
 * /applications:
 *   post:
 *     summary: Apply to a job
 *     tags: [Applications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jobId]
 *             properties:
 *               jobId:
 *                 type: string
 *                 format: uuid
 *               coverLetter:
 *                 type: string
 *                 maxLength: 5000
 *               resumeUrl:
 *                 type: string
 *                 format: uri
 *                 description: Overrides profile resume for this application
 *               answers:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *       400:
 *         description: Job not published / deadline passed
 *       403:
 *         description: Plan too low / monthly limit reached
 *       409:
 *         description: Already applied to this job
 */
router.post(
  '/',
  validate(createApplicationSchema),
  checkApplyLimit, // guard: monthly apply count vs plan limit
  checkJobPlan, // guard: user plan >= job.requiredPlan
  asyncHandler(UserApplicationController.applyToJob),
);

/**
 * @swagger
 * /applications:
 *   get:
 *     summary: List own applications (paginated, filterable by status)
 *     tags: [Applications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, UNDER_REVIEW, SHORTLISTED, INTERVIEW_SCHEDULED, OFFERED, HIRED, REJECTED, WITHDRAWN]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [appliedAt, updatedAt], default: appliedAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 */
router.get(
  '/',
  validate(listUserApplicationsSchema),
  asyncHandler(UserApplicationController.listMyApplications),
);

/**
 * @swagger
 * /applications/{id}:
 *   get:
 *     summary: Get single application detail
 *     tags: [Applications]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/:id',
  validate(applicationIdParamSchema),
  asyncHandler(UserApplicationController.getMyApplication),
);

/**
 * @swagger
 * /applications/{id}:
 *   delete:
 *     summary: Withdraw an application (only PENDING or UNDER_REVIEW)
 *     tags: [Applications]
 *     security:
 *       - BearerAuth: []
 */
router.delete(
  '/:id',
  validate(applicationIdParamSchema),
  asyncHandler(UserApplicationController.withdrawMyApplication),
);

export default router;
