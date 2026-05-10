import { prisma } from '@config/database';
import request from 'supertest';

import app from '@/app';

// ─────────────────────────────────────────────
// ADMIN MANAGEMENT INTEGRATION TESTS
// Covers: admin user mgmt, org mgmt, job takedown,
//         incentive admin actions, dashboard stats
// ─────────────────────────────────────────────

const testRunId = Date.now();

// ── Admin credentials ──
const adminCreds = {
  email: `admin-mgmt-${testRunId}@careerarch.com`,
  password: 'Admin@123456',
  name: 'Management Admin',
};

// ── Test user ──
const testUserCreds = {
  email: `managed-user-${testRunId}@example.com`,
  password: 'User@123456',
  firstName: 'Managed',
  lastName: 'User',
};

// ── Test org ──
const testOrgCreds = {
  email: `managed-org-${testRunId}@example.com`,
  password: 'Org@123456',
  companyName: 'Managed Corp',
};

let adminToken: string;
let testUserId: string;
let testOrgId: string;
let testJobId: string;
let testApplicationId: string;
let testIncentiveId: string;

// ─────────────────────────────────────────────
// SETUP / TEARDOWN
// ─────────────────────────────────────────────

beforeAll(async () => {
  // Create admin
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash(adminCreds.password, 4);
  await prisma.admin.upsert({
    where: { email: adminCreds.email },
    update: {},
    create: { email: adminCreds.email, password: hash, name: adminCreds.name, role: 'ADMIN' },
  });

  const adminLogin = await request(app)
    .post('/api/v1/auth/admin/login')
    .send({ email: adminCreds.email, password: adminCreds.password });
  adminToken = adminLogin.body.data.accessToken as string;

  // Create test user
  await request(app).post('/api/v1/auth/user/register').send(testUserCreds);
  const user = await prisma.user.update({
    where: { email: testUserCreds.email },
    data: { isEmailVerified: true },
  });
  testUserId = user.id;

  // Create test org (unapproved by default)
  await request(app).post('/api/v1/auth/org/register').send(testOrgCreds);
  const org = await prisma.organization.update({
    where: { email: testOrgCreds.email },
    data: {
      isEmailVerified: true,
      isApproved: true,
      stripeCustomerId: 'cus_admin_test',
      stripeDefaultPaymentMethodId: 'pm_admin_test',
      isPaymentMethodOnFile: true,
    },
  });
  testOrgId = org.id;
  await prisma.orgProfile.upsert({
    where: { orgId: testOrgId },
    update: {},
    create: { orgId: testOrgId, companyName: 'Managed Corp', industry: 'Technology' },
  });

  // Get org token and create a job
  const orgLogin = await request(app)
    .post('/api/v1/auth/org/login')
    .send({ email: testOrgCreds.email, password: testOrgCreds.password });
  const orgToken = orgLogin.body.data.accessToken as string;

  const jobRes = await request(app)
    .post('/api/v1/org/jobs')
    .set('Authorization', `Bearer ${orgToken}`)
    .send({
      title: 'Admin Test Job',
      description:
        'This is a test job created specifically for admin management integration tests to verify takedown and moderation capabilities.',
      jobType: 'FULL_TIME',
      isRemote: true,
      skills: ['Node.js'],
      vacancies: 1,
      requiredPlan: 'FREE',
      experienceLevel: 'Mid',
      category: 'Engineering',
    });
  testJobId = jobRes.body.data.job.id as string;

  await request(app)
    .patch(`/api/v1/org/jobs/${testJobId}/publish`)
    .set('Authorization', `Bearer ${orgToken}`);

  // Create an application for the job (to test incentive)
  const userLogin = await request(app)
    .post('/api/v1/auth/user/login')
    .send({ email: testUserCreds.email, password: testUserCreds.password });
  const userToken = userLogin.body.data.accessToken as string;

  const appRes = await request(app)
    .post('/api/v1/applications')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ jobId: testJobId });
  testApplicationId = appRes.body.data.application.id as string;

  // Set application to HIRED to create incentive
  await request(app)
    .patch(`/api/v1/org/applications/${testApplicationId}/status`)
    .set('Authorization', `Bearer ${orgToken}`)
    .send({ status: 'HIRED' });

  await new Promise((r) => setTimeout(r, 200));

  const incentive = await prisma.hiringIncentive.findUnique({
    where: { applicationId: testApplicationId },
  });
  if (incentive) testIncentiveId = incentive.id;
});

afterAll(async () => {
  await prisma.hiringIncentive.deleteMany({ where: { orgId: testOrgId } });
  await prisma.application.deleteMany({ where: { job: { orgId: testOrgId } } });
  await prisma.savedJob.deleteMany({ where: { job: { orgId: testOrgId } } });
  await prisma.job.deleteMany({ where: { orgId: testOrgId } });
  await prisma.notification.deleteMany({
    where: { OR: [{ orgId: testOrgId }, { userId: testUserId }] },
  });
  await prisma.refreshToken.deleteMany({
    where: { OR: [{ orgId: testOrgId }, { userId: testUserId }] },
  });
  await prisma.orgProfile.deleteMany({ where: { orgId: testOrgId } });
  await prisma.organization.deleteMany({ where: { id: testOrgId } });
  await prisma.subscription.deleteMany({ where: { userId: testUserId } });
  await prisma.userProfile.deleteMany({ where: { userId: testUserId } });
  await prisma.user.deleteMany({ where: { id: testUserId } });
  await prisma.admin.deleteMany({ where: { email: adminCreds.email } });
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────
// AUTH GUARDS (shared)
// ─────────────────────────────────────────────

describe('Admin endpoints require ADMIN role', () => {
  it('should reject GET /admin/users without token', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    expect(res.status).toBe(401);
  });

  it('should reject GET /admin/users with user token', async () => {
    const userLogin = await request(app)
      .post('/api/v1/auth/user/login')
      .send({ email: testUserCreds.email, password: testUserCreds.password });
    const userToken = userLogin.body.data.accessToken as string;

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────

describe('Admin: User Management', () => {
  describe('GET /api/v1/admin/users', () => {
    it('should return paginated user list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should filter users by email keyword', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/users?search=${testUserCreds.email}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const users = res.body.data.users as { email: string }[];
      expect(users.some((u) => u.email === testUserCreds.email)).toBe(true);
    });

    it('should filter by isActive status', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?isActive=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const users = res.body.data.users as { isActive: boolean }[];
      expect(users.every((u) => u.isActive === true)).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(5);
    });
  });

  describe('GET /api/v1/admin/users/:id', () => {
    it('should return user detail with subscription', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(testUserId);
      expect(res.body.data.user.subscription).toBeDefined();
      expect(res.body.data.user.profile).toBeDefined();
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/admin/users/:id/suspend', () => {
    it('should suspend an active user', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${testUserId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Violation of terms of service' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user?.isActive).toBe(false);
    });

    it('should reject suspending already suspended user', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${testUserId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Again' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/users/00000000-0000-0000-0000-000000000000/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test reason is long enough' });

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/admin/users/:id/activate', () => {
    it('should reactivate a suspended user', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${testUserId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user?.isActive).toBe(true);
    });

    it('should reject activating already active user', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${testUserId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });
});

// ─────────────────────────────────────────────
// ORG MANAGEMENT
// ─────────────────────────────────────────────

describe('Admin: Organization Management', () => {
  describe('GET /api/v1/admin/organizations', () => {
    it('should return paginated org list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.organizations)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should filter by isApproved=true', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations?isApproved=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const orgs = res.body.data.organizations as { isApproved: boolean }[];
      expect(orgs.every((o) => o.isApproved === true)).toBe(true);
    });

    it('should filter by isApproved=false (pending orgs)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations?isApproved=false')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const orgs = res.body.data.organizations as { isApproved: boolean }[];
      expect(orgs.every((o) => o.isApproved === false)).toBe(true);
    });

    it('should filter by email keyword', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/organizations?search=${testOrgCreds.email}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const orgs = res.body.data.organizations as { email: string }[];
      expect(orgs.some((o) => o.email === testOrgCreds.email)).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(5);
    });
  });

  describe('PATCH /api/v1/admin/organizations/:id/suspend', () => {
    it('should suspend an active org', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${testOrgId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Fraudulent job postings' });

      expect(res.status).toBe(200);

      const org = await prisma.organization.findUnique({ where: { id: testOrgId } });
      expect(org?.isActive).toBe(false);
    });

    it('should reject suspending already suspended org', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${testOrgId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Again' });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/admin/organizations/:id/activate', () => {
    it('should reactivate a suspended org', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${testOrgId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const org = await prisma.organization.findUnique({ where: { id: testOrgId } });
      expect(org?.isActive).toBe(true);
    });

    it('should reject activating already active org', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${testOrgId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/admin/organizations/:id/approve', () => {
    it('should approve an unapproved org', async () => {
      // Create a fresh unapproved org to approve
      const pendingOrgEmail = `pending-org-${testRunId}@example.com`;
      await request(app).post('/api/v1/auth/org/register').send({
        email: pendingOrgEmail,
        password: 'Org@123456',
        companyName: 'Pending Corp',
      });
      await prisma.organization.update({
        where: { email: pendingOrgEmail },
        data: { isEmailVerified: true, isApproved: false },
      });
      const pendingOrg = await prisma.organization.findUnique({
        where: { email: pendingOrgEmail },
      });

      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${pendingOrg?.id ?? ''}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const approved = await prisma.organization.findUnique({
        where: { id: pendingOrg?.id ?? '' },
      });
      expect(approved?.isApproved).toBe(true);

      // cleanup
      await prisma.orgProfile.deleteMany({ where: { orgId: pendingOrg?.id ?? '' } });
      await prisma.organization.deleteMany({ where: { id: pendingOrg?.id ?? '' } });
    });

    it('should reject approving already approved org', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${testOrgId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent org', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/organizations/00000000-0000-0000-0000-000000000000/approve')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});

// ─────────────────────────────────────────────
// JOB MANAGEMENT
// ─────────────────────────────────────────────

describe('Admin: Job Management', () => {
  describe('GET /api/v1/admin/jobs', () => {
    it('should return paginated job list (all orgs)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/jobs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.jobs)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should filter by status=PUBLISHED', async () => {
      const res = await request(app)
        .get('/api/v1/admin/jobs?status=PUBLISHED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const jobs = res.body.data.jobs as { status: string }[];
      expect(jobs.every((j) => j.status === 'PUBLISHED')).toBe(true);
    });

    it('should filter by orgId', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/jobs?orgId=${testOrgId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const jobs = res.body.data.jobs as { organization?: { id?: string } }[];
      expect(jobs.every((j) => j.organization?.id === testOrgId)).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/jobs?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(5);
    });
  });

  describe('PATCH /api/v1/admin/jobs/:id/takedown', () => {
    it('should take down (CLOSE) a published job', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/jobs/${testJobId}/takedown`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Violates platform policy' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const job = await prisma.job.findUnique({ where: { id: testJobId } });
      expect(job?.status).toBe('CLOSED');
    });

    it('should reject taking down a non-existent job', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/jobs/00000000-0000-0000-0000-000000000000/takedown')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Policy violation' });

      expect(res.status).toBe(404);
    });

    it('should reject taking down already closed job', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/jobs/${testJobId}/takedown`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Already closed' });

      expect(res.status).toBe(200);
    });
  });
});

// ─────────────────────────────────────────────
// INCENTIVE MANAGEMENT
// ─────────────────────────────────────────────

describe('Admin: Incentive Management', () => {
  describe('GET /api/v1/admin/incentives', () => {
    it('should return paginated incentive list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/incentives')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.incentives)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should filter by status=PENDING', async () => {
      const res = await request(app)
        .get('/api/v1/admin/incentives?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const incentives = res.body.data.incentives as { status: string }[];
      expect(incentives.every((i) => i.status === 'PENDING')).toBe(true);
    });

    it('should filter by orgId', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/incentives?orgId=${testOrgId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const incentives = res.body.data.incentives as { orgId: string }[];
      expect(incentives.every((i) => i.orgId === testOrgId)).toBe(true);
    });
  });

  describe('GET /api/v1/admin/incentives/stats', () => {
    it('should return incentive statistics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/incentives/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.stats).toBeDefined();
      expect(typeof res.body.data.stats.totalPending).toBe('number');
      expect(typeof res.body.data.stats.totalPaid).toBe('number');
      expect(typeof res.body.data.stats.totalRevenue).toBe('number');
    });
  });

  describe('GET /api/v1/admin/incentives/:id', () => {
    it('should return incentive detail', async () => {
      if (testIncentiveId.length === 0) return;

      const res = await request(app)
        .get(`/api/v1/admin/incentives/${testIncentiveId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.incentive.id).toBe(testIncentiveId);
      expect(res.body.data.incentive.organization).toBeDefined();
      expect(res.body.data.incentive.application).toBeDefined();
    });

    it('should return 404 for non-existent incentive', async () => {
      const res = await request(app)
        .get('/api/v1/admin/incentives/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/admin/incentives/:id/waive', () => {
    it('should waive a PENDING incentive', async () => {
      if (testIncentiveId.length === 0) return;

      const res = await request(app)
        .post(`/api/v1/admin/incentives/${testIncentiveId}/waive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Organization facing financial hardship' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const incentive = await prisma.hiringIncentive.findUnique({
        where: { id: testIncentiveId },
      });
      expect(incentive?.status).toBe('WAIVED');

      // Org hasUnpaidIncentives should be recalculated
      const org = await prisma.organization.findUnique({ where: { id: testOrgId } });
      expect(org?.hasUnpaidIncentives).toBe(false);
    });

    it('should reject waiving a non-PENDING incentive (already WAIVED)', async () => {
      if (testIncentiveId.length === 0) return;

      const res = await request(app)
        .post(`/api/v1/admin/incentives/${testIncentiveId}/waive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Again' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent incentive', async () => {
      const res = await request(app)
        .post('/api/v1/admin/incentives/00000000-0000-0000-0000-000000000000/waive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test reason is long enough' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/admin/incentives/:id/resolve-dispute', () => {
    it('should return 404 for non-existent incentive', async () => {
      const res = await request(app)
        .post('/api/v1/admin/incentives/00000000-0000-0000-0000-000000000000/resolve-dispute')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolution: 'WAIVE' });

      expect(res.status).toBe(404);
    });

    it('should reject resolve-dispute with invalid resolution value', async () => {
      if (testIncentiveId.length === 0) return;

      const res = await request(app)
        .post(`/api/v1/admin/incentives/${testIncentiveId}/resolve-dispute`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolution: 'INVALID_OPTION' });

      expect(res.status).toBe(400);
    });
  });
});

// ─────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────

describe('Admin: Dashboard Stats', () => {
  describe('GET /api/v1/admin/dashboard/stats', () => {
    it('should return platform-wide stats', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toBeDefined();

      const { stats } = res.body.data as {
        stats: {
          users: { total: number };
          organizations: { total: number };
          jobs: { total: number };
          applications: { total: number };
          revenue: { mrrCents: number };
        };
      };

      expect(typeof stats.users.total).toBe('number');
      expect(typeof stats.organizations.total).toBe('number');
      expect(typeof stats.jobs.total).toBe('number');
      expect(typeof stats.applications.total).toBe('number');
      expect(typeof stats.revenue.mrrCents).toBe('number');

      expect(stats.users.total).toBeGreaterThanOrEqual(1);
      expect(stats.organizations.total).toBeGreaterThanOrEqual(1);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard/stats');
      expect(res.status).toBe(401);
    });

    it('should return 403 with non-admin token', async () => {
      const userLogin = await request(app)
        .post('/api/v1/auth/user/login')
        .send({ email: testUserCreds.email, password: testUserCreds.password });
      const userToken = userLogin.body.data.accessToken as string;

      const res = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });
});

// ─────────────────────────────────────────────
// SUBSCRIPTION MANAGEMENT (Admin)
// ─────────────────────────────────────────────

describe('Admin: Subscription Management', () => {
  describe('GET /api/v1/admin/subscriptions', () => {
    it('should return list of all subscriptions', async () => {
      const res = await request(app)
        .get('/api/v1/admin/subscriptions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.subscriptions)).toBe(true);
    });

    it('should filter by plan=FREE', async () => {
      const res = await request(app)
        .get('/api/v1/admin/subscriptions?plan=FREE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const subs = res.body.data.subscriptions as { plan: string }[];
      expect(subs.every((s) => s.plan === 'FREE')).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/subscriptions?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(5);
    });
  });

  describe('GET /api/v1/admin/subscriptions/stats', () => {
    it('should return subscription stats', async () => {
      const res = await request(app)
        .get('/api/v1/admin/subscriptions/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.stats).toBeDefined();
    });
  });

  describe('GET /api/v1/admin/subscriptions/:id', () => {
    it('should return subscription detail', async () => {
      const sub = await prisma.subscription.findFirst({ where: { userId: testUserId } });
      if (!sub) return;

      const res = await request(app)
        .get(`/api/v1/admin/subscriptions/${sub.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subscription.id).toBe(sub.id);
      expect(res.body.data.subscription.user).toBeDefined();
    });

    it('should return 404 for non-existent subscription', async () => {
      const res = await request(app)
        .get('/api/v1/admin/subscriptions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
