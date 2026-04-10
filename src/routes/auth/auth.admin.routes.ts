import * as AdminAuthController from '@controllers/auth/admin.auth.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { loginLimiter } from '@middlewares/rateLimiter';
import { validate } from '@middlewares/validate';
import { asyncHandler } from '@utils/asyncHandler';
import { adminLoginSchema } from '@validations/auth.validation';
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
