import adminIncentiveRoutes from '@modules/admin/routes/admin.incentives.routes';
import adminJobsRoutes from '@modules/admin/routes/admin.jobs.routes';
import adminOrgRoutes from '@modules/admin/routes/admin.orgs.routes';
import adminPlansRoutes from '@modules/admin/routes/admin.plans.routes';
import adminStatsRoutes from '@modules/admin/routes/admin.stats.routes';
import adminSubscriptionsRoutes from '@modules/admin/routes/admin.subscriptions.routes';
import adminUserRoutes from '@modules/admin/routes/admin.users.routes';
import orgApplicationRoutes from '@modules/applications/routes/org.application.routes';
import orgJobApplicationRoutes from '@modules/applications/routes/org.job.applications.routes';
import applicationRoutes from '@modules/applications/routes/user.application.routes';
import adminAuthRoutes from '@modules/auth/routes/admin.auth.routes';
import orgAuthRoutes from '@modules/auth/routes/org.auth.routes';
import userAuthRoutes from '@modules/auth/routes/user.auth.routes';
import orgIncentiveRoutes from '@modules/incentives/routes/org.incentive.routes';
import orgJobsRoutes from '@modules/jobs/routes/org.jobs.routes';
import publicJobRoutes from '@modules/jobs/routes/public.job.routes';
import notificationRoutes from '@modules/notifications/routes/notification.routes';
import orgRoutes from '@modules/organizations/routes/org.routes';
import subscriptionRoutes from '@modules/subscriptions/routes/subscription.routes';
import userRoutes from '@modules/users/routes/user.routes';
import { Router } from 'express';

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
router.use('/admin/dashboard', adminStatsRoutes);

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
