import * as AdminUserController from '@controllers/admin/admin.user.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { validate } from '@middlewares/validate';
import { asyncHandler } from '@utils/asyncHandler';
import {
  adminListUsersSchema,
  adminUpdateUserStatusSchema,
  userIdParamSchema,
} from '@validations/user.validation';
import { Router } from 'express';

const router = Router();

// ── All routes below require a verified ADMIN session ──────────────────────
router.use(authenticate, authorize('ADMIN'));

// ─────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users (paginated + filterable)
 *     tags: [Admin - Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by email, first name, or last name
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: isEmailVerified
 *         schema: { type: boolean }
 *       - in: query
 *         name: plan
 *         schema: { type: string, enum: [FREE, BASIC, PREMIUM] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, email, lastLoginAt], default: createdAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated user list
 */
router.get('/', validate(adminListUsersSchema), asyncHandler(AdminUserController.listUsers));

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get user detail by ID
 *     tags: [Admin - Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 */
router.get('/:id', validate(userIdParamSchema), asyncHandler(AdminUserController.getUserById));

/**
 * @swagger
 * /admin/users/{id}/suspend:
 *   patch:
 *     summary: Suspend a user account
 *     tags: [Admin - Users]
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
 *                 description: Optional reason for suspension
 */
router.patch(
  '/:id/suspend',
  validate(adminUpdateUserStatusSchema),
  asyncHandler(AdminUserController.suspendUser),
);

/**
 * @swagger
 * /admin/users/{id}/activate:
 *   patch:
 *     summary: Re-activate a suspended user account
 *     tags: [Admin - Users]
 *     security:
 *       - BearerAuth: []
 */
router.patch(
  '/:id/activate',
  validate(adminUpdateUserStatusSchema),
  asyncHandler(AdminUserController.activateUser),
);

// ── Placeholder comment — org management, jobs, payments come in Phase 3d+ ─

export default router;
