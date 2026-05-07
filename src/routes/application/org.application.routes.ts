import * as OrgApplicationController from '@controllers/application/org.application.controller';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import {
  applicationIdParamSchema,
  listOrgApplicationsSchema,
  updateApplicationStatusSchema,
} from '@validations/application.validation';
import { Router } from 'express';

const router = Router();

// All org application routes require ORGANIZATION role
router.use(authenticate, authorize('ORGANIZATION'));

/**
 * @swagger
 * /org/applications:
 *   get:
 *     summary: List all applications across all jobs (paginated, filterable)
 *     tags: [Org Applications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, UNDER_REVIEW, SHORTLISTED, INTERVIEW_SCHEDULED, OFFERED, HIRED, REJECTED, WITHDRAWN]
 *       - in: query
 *         name: jobId
 *         schema: { type: string, format: uuid }
 *         description: Filter by a specific job
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
  validate(listOrgApplicationsSchema),
  asyncHandler(OrgApplicationController.listAllApplications),
);

/**
 * @swagger
 * /org/applications/{id}:
 *   get:
 *     summary: Get full application detail (with candidate profile)
 *     tags: [Org Applications]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/:id',
  validate(applicationIdParamSchema),
  asyncHandler(OrgApplicationController.getApplicationDetail),
);

/**
 * @swagger
 * /org/applications/{id}/status:
 *   patch:
 *     summary: Update application status (triggers email + Socket.IO notification)
 *     tags: [Org Applications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [UNDER_REVIEW, SHORTLISTED, INTERVIEW_SCHEDULED, OFFERED, HIRED, REJECTED]
 *               notes:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Internal org notes (not visible to applicant)
 *     responses:
 *       200:
 *         description: Status updated — real-time event emitted to user
 *       400:
 *         description: Invalid status transition or withdrawn application
 *       404:
 *         description: Application not found
 */
router.patch(
  '/:id/status',
  validate(updateApplicationStatusSchema),
  asyncHandler(OrgApplicationController.updateStatus),
);

export default router;
