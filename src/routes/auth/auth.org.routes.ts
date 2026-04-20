import * as OrgAuthController from '@controllers/auth/org.auth.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { forgotPasswordLimiter, loginLimiter, registerLimiter } from '@middlewares/rateLimiter';
import { validate } from '@middlewares/validate';
import { asyncHandler } from '@utils/asyncHandler';
import {
  forgotPasswordSchema,
  orgLoginSchema,
  orgRegisterSchema,
  resetPasswordSchema,
  twoFaDisableSchema,
  twoFaValidateSchema,
  twoFaVerifySchema,
  verifyEmailSchema,
} from '@validations/auth.validation';
import { Router } from 'express';

const router = Router();

// ── Public routes ──────────────────────────────────────────────────────────

router.post(
  '/register',
  registerLimiter,
  validate(orgRegisterSchema),
  asyncHandler(OrgAuthController.register),
);

router.post(
  '/login',
  loginLimiter,
  validate(orgLoginSchema),
  asyncHandler(OrgAuthController.login),
);

router.post('/logout', asyncHandler(OrgAuthController.logout));

router.post('/refresh-token', asyncHandler(OrgAuthController.refreshToken));

router.get(
  '/verify-email',
  validate(verifyEmailSchema),
  asyncHandler(OrgAuthController.verifyEmail),
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(OrgAuthController.forgotPassword),
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(OrgAuthController.resetPassword),
);

router.post(
  '/2fa/validate',
  validate(twoFaValidateSchema),
  asyncHandler(OrgAuthController.validateTwoFa),
);

// ── Protected routes ───────────────────────────────────────────────────────
router.use(authenticate, authorize('ORGANIZATION'));

router.get('/me', asyncHandler(OrgAuthController.getMe));

router.post('/2fa/setup', asyncHandler(OrgAuthController.setupTwoFa));

router.post(
  '/2fa/verify',
  validate(twoFaVerifySchema),
  asyncHandler(OrgAuthController.verifyTwoFa),
);

router.post(
  '/2fa/disable',
  validate(twoFaDisableSchema),
  asyncHandler(OrgAuthController.disableTwoFa),
);

export default router;
