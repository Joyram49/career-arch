import { Router } from 'express';

import adminAuthRoutes from './auth/auth.admin.routes';
import orgAuthRoutes from './auth/auth.org.routes';
import userAuthRoutes from './auth/auth.user.routes';

const router = Router();

// ── Auth Routes ────────────────────────────────────────────────────────────
router.use('/auth/user', userAuthRoutes);
router.use('/auth/org', orgAuthRoutes);
router.use('/auth/admin', adminAuthRoutes);

// ── Placeholder routes (to be built in Phase 3) ───────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'CareerArch API is running',
    timestamp: new Date().toISOString(),
    version: process.env['npm_package_version'] ?? '1.0.0',
  });
});

export default router;
