import { Router } from 'express';

import adminOrgRoutes from './admin/admin.org.controller';
import adminAuthRoutes from './auth/auth.admin.routes';
import orgAuthRoutes from './auth/auth.org.routes';
import userAuthRoutes from './auth/auth.user.routes';
import orgRoutes from './org/org.routes';

const router = Router();

// ── Auth Routes ────────────────────────────────────────────────────────────
router.use('/auth/user', userAuthRoutes);
router.use('/auth/org', orgAuthRoutes);
router.use('/auth/admin', adminAuthRoutes);

// ── Org Routes (Phase 3A) ──────────────────────────────────────────────────
router.use('/org', orgRoutes);

// ── Admin Routes (Phase 3A) ────────────────────────────────────────────────
router.use('/admin/organizations', adminOrgRoutes);

// ── Health check ──────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'CareerArch API is running',
    timestamp: new Date().toISOString(),
    version: process.env['npm_package_version'] ?? '1.0.0',
  });
});

export default router;
