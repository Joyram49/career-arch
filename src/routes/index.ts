import { Router } from 'express';

import adminOrgRoutes from './admin/admin.org.routes';
import adminPlansRoutes from './admin/admin.plan.routes';
import adminSubscriptionsRoutes from './admin/admin.subscription.routes';
import adminUserRoutes from './admin/admin.user.routes';
import adminAuthRoutes from './auth/auth.admin.routes';
import orgAuthRoutes from './auth/auth.org.routes';
import userAuthRoutes from './auth/auth.user.routes';
import orgJobsRoutes from './org/org.jobs.routes';
import orgRoutes from './org/org.routes';
import subscriptionRoutes from './subscription/subscription.routes';
import userRoutes from './user/user.routes';
import webHookRoutes from './webhooks/webhook.routes';

const router = Router();

// ── Webhook routes (raw body — must be before express.json() on these paths)
// Mounted at /webhooks/* so the raw parser only applies here
router.use('/webhooks', webHookRoutes);

// ── Auth Routes ────────────────────────────────────────────────────────────
router.use('/auth/user', userAuthRoutes);
router.use('/auth/org', orgAuthRoutes);
router.use('/auth/admin', adminAuthRoutes);

// ── User Profile Routes ────────────────────────────────────────────────────
router.use('/user', userRoutes);
router.use('/subscription', subscriptionRoutes);

// ── Org Routes  ──────────────────────────────────────────────────
router.use('/org', orgRoutes);
router.use('/org/jobs', orgJobsRoutes);

// ── Admin Routes  ────────────────────────────────────────────────
router.use('/admin/organizations', adminOrgRoutes);
router.use('/admin/users', adminUserRoutes);
router.use('/admin/plans', adminPlansRoutes);
router.use('/admin/subscriptions', adminSubscriptionsRoutes);

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
