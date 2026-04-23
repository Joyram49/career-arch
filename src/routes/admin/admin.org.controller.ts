import * as AdminOrgController from '@controllers/admin/admin.org.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { asyncHandler } from '@utils/asyncHandler';
import { Router } from 'express';

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
 *         name: isApproved
 *         schema:
 *           type: boolean
 *         description: Filter by approval status
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 */
router.get('/', asyncHandler(AdminOrgController.listOrganizations));

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
