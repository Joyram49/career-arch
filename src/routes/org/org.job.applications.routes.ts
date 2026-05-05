import * as OrgApplicationController from '@controllers/application/org.application.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { validate } from '@middlewares/validate';
import { asyncHandler } from '@utils/asyncHandler';
import { listJobApplicationsSchema } from '@validations/application.validation';
import { Router } from 'express';

// This router is mounted at /org/jobs and adds the /:jobId/applications sub-route
// alongside the existing job CRUD routes in org.jobs.routes.ts
const router = Router();

router.use(authenticate, authorize('ORGANIZATION'));

/**
 * @swagger
 * /org/jobs/{jobId}/applications:
 *   get:
 *     summary: List all applications for a specific job
 *     tags: [Org Applications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
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
  '/:jobId/applications',
  validate(listJobApplicationsSchema),
  asyncHandler(OrgApplicationController.listApplicationsForJob),
);

export default router;
