import * as UserController from '@controllers/user/user.profile.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { uploadAvatarMiddleware, uploadResumeMiddleware } from '@middlewares/upload';
import { validate } from '@middlewares/validate';
import { asyncHandler } from '@utils/asyncHandler';
import {
  changePasswordSchema,
  deactivateAccountSchema,
  updateProfileSchema,
} from '@validations/user.validation';
import { Router } from 'express';

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

export default router;
