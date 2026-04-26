import * as AdminOrgController from '@controllers/admin/admin.org.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { asyncHandler } from '@utils/asyncHandler';
import { Router } from 'express';

import { validate } from '@/middlewares/validate';
import { adminListOrgSchema } from '@/validations/admin.validation';

const router = Router();

// All admin routes require a valid ADMIN token
router.use(authenticate, authorize('ADMIN'));

/**
 * @swagger
 * /admin/organizations:
 *   get:
 *     summary: List all organizations with optional filters
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Keyword search (email, companyName, location, country)
 *
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location or country (e.g. Dhaka, Bangladesh)
 *
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by active status
 *
 *       - in: query
 *         name: isEmailVerified
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by email verification status
 *
 *       - in: query
 *         name: isApproved
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by approval status
 *
 *       - in: query
 *         name: isPaymentMethodOnFile
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by payment method availability
 *
 *       - in: query
 *         name: hasUnpaidIncentives
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter organizations with unpaid incentives
 *
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, email, lastLoginAt, foundedYear]
 *           default: createdAt
 *         description: Field to sort by
 *
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction
 */
router.get('/', validate(adminListOrgSchema), asyncHandler(AdminOrgController.listOrganizations));

/**
 * @swagger
 * /admin/organizations/{id}/approve:
 *   patch:
 *     summary: Approve an organization (creates Stripe Customer)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.patch('/:id/approve', asyncHandler(AdminOrgController.approveOrganization));

/**
 * @swagger
 * /admin/organizations/{id}/suspend:
 *   patch:
 *     summary: Suspend an organization
 *     tags: [Admin]
 */
router.patch('/:id/suspend', asyncHandler(AdminOrgController.suspendOrganization));

/**
 * @swagger
 * /admin/organizations/{id}/activate:
 *   patch:
 *     summary: Reactivate a suspended organization
 *     tags: [Admin]
 */
router.patch('/:id/activate', asyncHandler(AdminOrgController.activateOrganization));

export default router;
