import * as SavedJobController from '@controllers/user/saved.job.controller';
import * as UserController from '@controllers/user/user.profile.controller';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { checkSaveJobLimit } from '@shared/middlewares/checkSaveJobLimit';
import { uploadAvatarMiddleware, uploadResumeMiddleware } from '@shared/middlewares/upload';
import { validate } from '@shared/middlewares/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import {
  changePasswordSchema,
  deactivateAccountSchema,
  updateProfileSchema,
} from '@validations/user.validation';
import { Router } from 'express';

import { jobIdParamForSaveSchema } from '@/validations/application.validation';

const router = Router();

// ── All routes below require a verified USER session ───────────────────────
router.use(authenticate, authorize('USER'));

/**
 * @swagger
 * /user/profile:
 *   get:
 *     summary: Get own profile
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', asyncHandler(UserController.getProfile));

/**
 * @swagger
 * /user/profile:
 *   put:
 *     summary: Update own profile
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 */
router.put('/profile', validate(updateProfileSchema), asyncHandler(UserController.updateProfile));

/**
 * @swagger
 * /user/profile/avatar:
 *   post:
 *     summary: Upload avatar image
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 */
router.post(
  '/profile/avatar',
  uploadAvatarMiddleware.single('avatar'),
  asyncHandler(UserController.uploadAvatar),
);

/**
 * @swagger
 * /user/profile/resume:
 *   post:
 *     summary: Upload resume PDF
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/profile/resume',
  uploadResumeMiddleware.single('resume'),
  asyncHandler(UserController.uploadResume),
);

/**
 * @swagger
 * /user/profile/resume:
 *   delete:
 *     summary: Delete resume
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 */
router.delete('/profile/resume', asyncHandler(UserController.deleteResume));

/**
 * @swagger
 * /user/change-password:
 *   put:
 *     summary: Change password
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/change-password',
  validate(changePasswordSchema),
  asyncHandler(UserController.changePassword),
);

/**
 * @swagger
 * /user/account:
 *   delete:
 *     summary: Deactivate own account
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 */
router.delete(
  '/account',
  validate(deactivateAccountSchema),
  asyncHandler(UserController.deactivateAccount),
);

// ─────────────────────────────────────────────
// SAVED JOBS
// ─────────────────────────────────────────────

/**
 * @swagger
 * /user/saved-jobs:
 *   get:
 *     summary: List all saved jobs (paginated)
 *     tags: [Saved Jobs]
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
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 */
router.get('/saved-jobs', asyncHandler(SavedJobController.listSavedJobs));

/**
 * @swagger
 * /user/jobs/{id}/save:
 *   post:
 *     summary: Save a job
 *     tags: [Saved Jobs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 */
router.post(
  '/jobs/:id/save',
  validate(jobIdParamForSaveSchema),
  checkSaveJobLimit,
  asyncHandler(SavedJobController.saveJob),
);

/**
 * @swagger
 * /user/jobs/{id}/save:
 *   delete:
 *     summary: Remove a saved job
 *     tags: [Saved Jobs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 */
router.delete(
  '/jobs/:id/save',
  validate(jobIdParamForSaveSchema),
  asyncHandler(SavedJobController.unsaveJob),
);

export default router;
