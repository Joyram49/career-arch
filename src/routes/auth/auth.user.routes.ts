import * as UserAuthController from '@controllers/auth/user.auth.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { forgotPasswordLimiter, loginLimiter, registerLimiter } from '@middlewares/rateLimiter';
import { validate } from '@middlewares/validate';
import { asyncHandler } from '@utils/asyncHandler';
import {
  forgotPasswordSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  twoFaDisableSchema,
  twoFaValidateSchema,
  twoFaVerifySchema,
  userLoginSchema,
  userRegisterSchema,
  verifyEmailSchema,
} from '@validations/auth.validation';
import { Router } from 'express';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: User Auth
 *   description: User authentication endpoints
 */

// ── Public routes ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/user/register:
 *   post:
 *     summary: Register a new user
 *     tags: [User Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registration successful
 *       409:
 *         description: Email already exists
 */
router.post(
  '/register',
  registerLimiter,
  validate(userRegisterSchema),
  asyncHandler(UserAuthController.register),
);

/**
 * @swagger
 * /auth/user/login:
 *   post:
 *     summary: User login
 *     tags: [User Auth]
 */
router.post(
  '/login',
  loginLimiter,
  validate(userLoginSchema),
  asyncHandler(UserAuthController.login),
);

router.post('/logout', asyncHandler(UserAuthController.logout));

router.post('/refresh-token', asyncHandler(UserAuthController.refreshToken));

router.get(
  '/verify-email',
  validate(verifyEmailSchema),
  asyncHandler(UserAuthController.verifyEmail),
);

router.post(
  '/resend-verification',
  validate(resendVerificationSchema),
  asyncHandler(UserAuthController.resendVerification),
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(UserAuthController.forgotPassword),
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(UserAuthController.resetPassword),
);

// ── 2FA — public (called during login flow before full auth) ───────────────
router.post(
  '/2fa/validate',
  validate(twoFaValidateSchema),
  asyncHandler(UserAuthController.validateTwoFa),
);

// ── Protected routes (require valid access token) ──────────────────────────
router.use(authenticate, authorize('USER'));

router.get('/me', asyncHandler(UserAuthController.getMe));

router.post('/2fa/setup', asyncHandler(UserAuthController.setupTwoFa));

router.post(
  '/2fa/verify',
  validate(twoFaVerifySchema),
  asyncHandler(UserAuthController.verifyTwoFa),
);

router.post(
  '/2fa/disable',
  validate(twoFaDisableSchema),
  asyncHandler(UserAuthController.disableTwoFa),
);

export default router;
