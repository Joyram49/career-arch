import { Router } from 'express';

import adminDashboardRoutes from './admin/admin.dashboard.routes';
import adminIncentiveRoutes from './admin/admin.incentive.routes';
import adminJobsRoutes from './admin/admin.jobs.routes';
import adminOrgRoutes from './admin/admin.org.routes';
import adminPlansRoutes from './admin/admin.plan.routes';
import adminSubscriptionsRoutes from './admin/admin.subscription.routes';
import adminUserRoutes from './admin/admin.user.routes';
import applicationRoutes from './application/application.routes';
import orgApplicationRoutes from './application/org.application.routes';
import adminAuthRoutes from './auth/auth.admin.routes';
import orgAuthRoutes from './auth/auth.org.routes';
import userAuthRoutes from './auth/auth.user.routes';
import notificationRoutes from './notifications/notification.routes';
import orgIncentiveRoutes from './org/org.incentive.routes';
import orgJobApplicationRoutes from './org/org.job.applications.routes';
import orgJobsRoutes from './org/org.jobs.routes';
import orgRoutes from './org/org.routes';
import subscriptionRoutes from './subscription/subscription.routes';
import publicJobRoutes from './user/public.job.routes';
import userRoutes from './user/user.routes';

const router = Router();

// ── Auth Routes ────────────────────────────────────────────────────────────
router.use('/auth/user', userAuthRoutes);
router.use('/auth/org', orgAuthRoutes);
router.use('/auth/admin', adminAuthRoutes);

// ── Application Routes (user-side) ────────────────────────────────────────
router.use('/applications', applicationRoutes);

// ── Public Job Routes ──────────────────────────────────────────────────────
// NOTE: /jobs/categories must be declared before /jobs/:slug in public.job.routes.ts
router.use('/jobs', publicJobRoutes);

// ── User Profile Routes ────────────────────────────────────────────────────
router.use('/user', userRoutes);
router.use('/subscription', subscriptionRoutes);

// ── Notification Routes ───────────────────────────────────────────────────
router.use('/notifications', notificationRoutes);

// ── Org Routes  ──────────────────────────────────────────────────
router.use('/org', orgRoutes);
router.use('/org/jobs', orgJobsRoutes);
router.use('/org/incentives', orgIncentiveRoutes);

// Org application routes: /org/jobs/:jobId/applications
// Mounted separately from orgJobsRoutes to avoid param conflicts
router.use('/org/jobs', orgJobApplicationRoutes);

// Org-wide application management: /org/applications, /org/applications/:id/status
router.use('/org/applications', orgApplicationRoutes);

// ── Admin Routes  ────────────────────────────────────────────────
router.use('/admin/organizations', adminOrgRoutes);
router.use('/admin/users', adminUserRoutes);
router.use('/admin/plans', adminPlansRoutes);
router.use('/admin/subscriptions', adminSubscriptionsRoutes);
router.use('/admin/incentives', adminIncentiveRoutes);
router.use('/admin/jobs', adminJobsRoutes);
router.use('/admin/dashboard', adminDashboardRoutes);

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
