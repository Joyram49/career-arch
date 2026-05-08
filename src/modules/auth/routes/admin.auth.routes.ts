import * as AdminAuthController from '@modules/auth/controllers/admin.auth.controller';
import { adminLoginSchema } from '@modules/auth/validations/auth.validation';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { loginLimiter } from '@shared/middlewares/rateLimiter';
import { validate } from '@shared/middlewares/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { Router } from 'express';

const router = Router();

// ── Public routes ──────────────────────────────────────────────────────────

router.post(
  '/login',
  loginLimiter,
  validate(adminLoginSchema),
  asyncHandler(AdminAuthController.login),
);

router.post('/logout', asyncHandler(AdminAuthController.logout));

router.post('/refresh-token', asyncHandler(AdminAuthController.refreshToken));

// ── Protected routes ───────────────────────────────────────────────────────
router.use(authenticate, authorize('ADMIN'));

router.get('/me', asyncHandler(AdminAuthController.getMe));

export default router;
