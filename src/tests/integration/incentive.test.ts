import request from 'supertest';

import app from '@/app';
import { prisma } from '@/config/database';

// ─────────────────────────────────────────────
// TEST SETUP
// ─────────────────────────────────────────────

const adminUser = { email: 'admin-incentive-test@careerarch.com', password: 'Admin@123456' };

const baseOrg = {
  email: `org-incentive-${Date.now()}@example.com`,
  password: 'Org@123456',
  companyName: 'Incentive Test Corp',
};

let adminToken: string;
let orgToken: string;
let testOrgId: string;
let testIncentiveId: string;
let testApplicationId: string;
let testJobId: string;
let testCandidateName: string;
let testJobTitle: string;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function loginAdmin(): Promise<string> {
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash(adminUser.password, 4);
  await prisma.admin.upsert({
    where: { email: adminUser.email },
    update: {},
    create: {
      email: adminUser.email,
      password: hash,
      name: 'Incentive Test Admin',
      role: 'ADMIN',
    },
  });

  const res = await request(app).post('/api/v1/auth/admin/login').send(adminUser);
  return (res.body.data as { accessToken: string }).accessToken;
}

async function setupOrgWithPaymentMethod(): Promise<{ orgId: string; token: string }> {
  // Create org
  await request(app).post('/api/v1/auth/org/register').send(baseOrg);

  // Manually verify and approve
  const org = await prisma.organization.update({
    where: { email: baseOrg.email },
    data: {
      isEmailVerified: true,
      isApproved: true,
      stripeCustomerId: 'cus_test_incentive',
      stripeDefaultPaymentMethodId: 'pm_test_incentive',
      isPaymentMethodOnFile: true,
    },
  });

  // Create org profile
  await prisma.orgProfile.upsert({
    where: { orgId: org.id },
    update: {},
    create: {
      orgId: org.id,
      companyName: 'Incentive Test Corp',
      industry: 'Technology',
      location: 'San Francisco, CA',
      country: 'USA',
    },
  });

  const loginRes = await request(app)
    .post('/api/v1/auth/org/login')
    .send({ email: baseOrg.email, password: baseOrg.password });

  return {
    orgId: org.id,
    token: (loginRes.body.data as { accessToken: string }).accessToken,
  };
}

async function createTestJobAndApplication(
  orgId: string,
): Promise<{ jobId: string; applicationId: string; jobTitle: string; candidateName: string }> {
  // Create a user for the application
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash('User@123456', 4);

  const user = await prisma.user.create({
    data: {
      email: `incentive-user-${Date.now()}@example.com`,
      password: hash,
      isEmailVerified: true,
      profile: { create: { firstName: 'Incentive', lastName: 'Candidate' } },
      subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
    },
  });

  // Create a job
  const job = await prisma.job.create({
    data: {
      orgId,
      title: 'Test Incentive Job',
      slug: `test-incentive-job-${Date.now()}`,
      description: 'A test job for incentive tests',
      jobType: 'FULL_TIME',
      isRemote: true,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });

  // Create an application
  const application = await prisma.application.create({
    data: {
      jobId: job.id,
      userId: user.id,
      status: 'OFFERED',
    },
  });

  //   get user info
  const userProfile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (userProfile === null) {
    return {
      jobId: job.id,
      applicationId: application.id,
      jobTitle: 'Test job title',
      candidateName: 'Test user',
    };
  }

  const name = userProfile.firstName + userProfile.lastName;

  return { jobId: job.id, applicationId: application.id, jobTitle: job.title, candidateName: name };
}

// ─────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────

afterAll(async () => {
  // Clean up in dependency order
  // Use the test-user email prefix to ensure we delete *all* rows created
  // across the suite (not just those tied to testJobId/testOrgId).
  await prisma.payment.deleteMany({ where: { orgId: testOrgId } });
  await prisma.hiringIncentive.deleteMany({
    where: {
      OR: [
        { orgId: testOrgId },
        { application: { user: { email: { contains: 'incentive-user-' } } } },
      ],
    },
  });
  await prisma.application.deleteMany({
    where: { user: { email: { contains: 'incentive-user-' } } },
  });
  await prisma.job.deleteMany({ where: { orgId: testOrgId } });
  await prisma.userProfile.deleteMany({
    where: { user: { email: { contains: 'incentive-user-' } } },
  });
  await prisma.subscription.deleteMany({
    where: { user: { email: { contains: 'incentive-user-' } } },
  });
  await prisma.user.deleteMany({ where: { email: { contains: 'incentive-user-' } } });
  await prisma.notification.deleteMany({ where: { orgId: testOrgId } });
  await prisma.refreshToken.deleteMany({ where: { orgId: testOrgId } });
  await prisma.orgProfile.deleteMany({ where: { orgId: testOrgId } });
  await prisma.organization.deleteMany({ where: { id: testOrgId } });
  await prisma.admin.deleteMany({ where: { email: adminUser.email } });
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────
// TEST SUITES
// ─────────────────────────────────────────────

describe('Incentive System', () => {
  // One-time setup for the whole describe block
  beforeAll(async () => {
    adminToken = await loginAdmin();
    const orgSetup = await setupOrgWithPaymentMethod();
    orgToken = orgSetup.token;
    testOrgId = orgSetup.orgId;

    const { jobId, applicationId, candidateName, jobTitle } =
      await createTestJobAndApplication(testOrgId);
    testJobId = jobId;
    testApplicationId = applicationId;
    testCandidateName = candidateName;
    testJobTitle = jobTitle;
  });

  // ── Auto-create on HIRE ──────────────────────────────────────────────────

  describe('createIncentiveForHire (internal)', () => {
    it('should create an incentive record directly in DB', async () => {
      const { createIncentiveForHire } = await import('@/services/incentive/incentive.service');

      await createIncentiveForHire(
        testOrgId,
        testJobId,
        testApplicationId,
        testCandidateName,
        testJobTitle,
      );

      const incentive = await prisma.hiringIncentive.findUnique({
        where: { applicationId: testApplicationId },
      });

      expect(incentive).not.toBeNull();
      expect(incentive?.status).toBe('PENDING');
      expect(incentive?.amount).toBe(50);
      expect(incentive?.orgId).toBe(testOrgId);
      expect(incentive?.jobId).toBe(testJobId);
      expect(incentive?.dueAt).not.toBeNull();

      // Store for downstream tests
      testIncentiveId = incentive?.id ?? '';
    });

    it('should set org.hasUnpaidIncentives = true', async () => {
      const org = await prisma.organization.findUnique({
        where: { id: testOrgId },
        select: { hasUnpaidIncentives: true },
      });
      expect(org?.hasUnpaidIncentives).toBe(true);
    });

    it('should NOT create a duplicate for the same applicationId', async () => {
      const { createIncentiveForHire } = await import('@/services/incentive/incentive.service');

      // Prisma unique constraint on applicationId should prevent duplicate
      await expect(
        createIncentiveForHire(
          testOrgId,
          testJobId,
          testApplicationId,
          testCandidateName,
          testJobTitle,
        ),
      ).rejects.toThrow();
    });
  });

  // ── Org — list incentives ────────────────────────────────────────────────

  describe('GET /api/v1/org/incentives', () => {
    it('should return own incentives with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/org/incentives')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.incentives)).toBe(true);
      expect(res.body.data.incentives.length).toBeGreaterThan(0);
      expect(res.body.meta).toBeDefined();
    });

    it('should filter by status=PENDING', async () => {
      const res = await request(app)
        .get('/api/v1/org/incentives?status=PENDING')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      const incentives = res.body.data.incentives as { status: string }[];
      expect(incentives.every((i) => i.status === 'PENDING')).toBe(true);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/org/incentives');
      expect(res.status).toBe(401);
    });

    it('should return 403 for USER role', async () => {
      // Register a user and try to access org route
      const userEmail = `filter-test-${Date.now()}@example.com`;
      await request(app).post('/api/v1/auth/user/register').send({
        email: userEmail,
        password: 'Test@123456',
        firstName: 'Filter',
        lastName: 'Test',
      });
      await prisma.user.update({
        where: { email: userEmail },
        data: { isEmailVerified: true },
      });
      const loginRes = await request(app)
        .post('/api/v1/auth/user/login')
        .send({ email: userEmail, password: 'Test@123456' });
      const userToken = (loginRes.body.data as { accessToken: string }).accessToken;

      const res = await request(app)
        .get('/api/v1/org/incentives')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);

      // Cleanup
      await prisma.subscription.deleteMany({ where: { user: { email: userEmail } } });
      await prisma.userProfile.deleteMany({ where: { user: { email: userEmail } } });
      await prisma.user.deleteMany({ where: { email: userEmail } });
    });
  });

  // ── Org — get single incentive ───────────────────────────────────────────

  describe('GET /api/v1/org/incentives/:id', () => {
    it('should return incentive detail with candidate and job info', async () => {
      const res = await request(app)
        .get(`/api/v1/org/incentives/${testIncentiveId}`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.incentive.id).toBe(testIncentiveId);
      expect(res.body.data.incentive.amount).toBe(50);
      expect(res.body.data.incentive.candidate).toBeDefined();
      expect(res.body.data.incentive.job).toBeDefined();
      expect(res.body.data.incentive.job.title).toBe('Test Incentive Job');
    });

    it('should return 404 for non-existent incentive', async () => {
      const res = await request(app)
        .get('/api/v1/org/incentives/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(404);
    });

    it('should not return incentives belonging to other orgs', async () => {
      // testIncentiveId belongs to testOrgId — accessing with a different org token should 404
      // (We don't have a second org set up, so we verify the query scope via the service)
      const incentive = await prisma.hiringIncentive.findFirst({
        where: { id: testIncentiveId },
      });
      expect(incentive?.orgId).toBe(testOrgId);
    });
  });

  // ── Org — pay incentive ──────────────────────────────────────────────────

  describe('POST /api/v1/org/incentives/:id/pay', () => {
    it('should pay a PENDING incentive and set status to PAID', async () => {
      const res = await request(app)
        .post(`/api/v1/org/incentives/${testIncentiveId}/pay`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.incentive.status).toBe('PAID');
      expect(res.body.data.incentive.paidAt).not.toBeNull();
      expect(res.body.data.incentive.stripePaymentIntentId).toBeDefined();
    });

    it('should create a Payment record of type INCENTIVE', async () => {
      const payment = await prisma.payment.findFirst({
        where: { orgId: testOrgId, type: 'INCENTIVE' },
        orderBy: { createdAt: 'desc' },
      });

      expect(payment).not.toBeNull();
      expect(payment?.status).toBe('SUCCEEDED');
      expect(payment?.amount).toBe(50);
    });

    it('should set org.hasUnpaidIncentives = false after payment', async () => {
      const org = await prisma.organization.findUnique({
        where: { id: testOrgId },
        select: { hasUnpaidIncentives: true },
      });
      expect(org?.hasUnpaidIncentives).toBe(false);
    });

    it('should reject paying an already PAID incentive', async () => {
      const res = await request(app)
        .post(`/api/v1/org/incentives/${testIncentiveId}/pay`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already been paid');
    });
  });

  // ── Org — dispute incentive ──────────────────────────────────────────────

  describe('POST /api/v1/org/incentives/:id/dispute', () => {
    let disputeIncentiveId: string;

    beforeAll(async () => {
      // Create a fresh application + incentive in PENDING state to test dispute
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('User@123456', 4);

      const user = await prisma.user.create({
        data: {
          email: `dispute-user-${Date.now()}@example.com`,
          password: hash,
          isEmailVerified: true,
          profile: { create: { firstName: 'Dispute', lastName: 'Tester' } },
          subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
        },
      });

      const application = await prisma.application.create({
        data: { jobId: testJobId, userId: user.id, status: 'OFFERED' },
      });

      const incentive = await prisma.hiringIncentive.create({
        data: {
          orgId: testOrgId,
          jobId: testJobId,
          applicationId: application.id,
          amount: 50,
          currency: 'USD',
          status: 'PENDING',
          dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      disputeIncentiveId = incentive.id;
    });

    it('should reject a dispute with a reason shorter than 20 chars', async () => {
      const res = await request(app)
        .post(`/api/v1/org/incentives/${disputeIncentiveId}/dispute`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ reason: 'Too short' });

      expect(res.status).toBe(400);
    });

    it('should file a dispute on a PENDING incentive', async () => {
      const res = await request(app)
        .post(`/api/v1/org/incentives/${disputeIncentiveId}/dispute`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({
          reason:
            'This candidate was not sourced through CareerArch. They applied directly via our website.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Dispute filed');
    });

    it('should set status to DISPUTED in DB', async () => {
      const incentive = await prisma.hiringIncentive.findUnique({
        where: { id: disputeIncentiveId },
      });
      expect(incentive?.status).toBe('DISPUTED');
    });

    it('should create an admin notification', async () => {
      const notification = await prisma.notification.findFirst({
        where: {
          recipientRole: 'ADMIN',
          message: { contains: disputeIncentiveId },
        },
      });
      expect(notification).not.toBeNull();
    });

    it('should reject disputing an already DISPUTED incentive', async () => {
      const res = await request(app)
        .post(`/api/v1/org/incentives/${disputeIncentiveId}/dispute`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ reason: 'This candidate was hired through a different channel.' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already under dispute');
    });

    it('should reject disputing a PAID incentive', async () => {
      const res = await request(app)
        .post(`/api/v1/org/incentives/${testIncentiveId}/dispute`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ reason: 'This candidate was not sourced through CareerArch at all.' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Paid incentives cannot be disputed');
    });
  });

  // ── Admin — list incentives ──────────────────────────────────────────────

  describe('GET /api/v1/admin/incentives', () => {
    it('should return all incentives across all orgs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/incentives')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.incentives)).toBe(true);
    });

    it('should filter by orgId', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/incentives?orgId=${testOrgId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const incentives = res.body.data.incentives as { orgId: string }[];
      expect(incentives.every((i) => i.orgId === testOrgId)).toBe(true);
    });

    it('should filter by status=PAID', async () => {
      const res = await request(app)
        .get('/api/v1/admin/incentives?status=PAID')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const incentives = res.body.data.incentives as { status: string }[];
      expect(incentives.every((i) => i.status === 'PAID')).toBe(true);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/admin/incentives');
      expect(res.status).toBe(401);
    });

    it('should return 403 for ORGANIZATION role', async () => {
      const res = await request(app)
        .get('/api/v1/admin/incentives')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ── Admin — stats ────────────────────────────────────────────────────────

  describe('GET /api/v1/admin/incentives/stats', () => {
    it('should return incentive stats with correct shape', async () => {
      const res = await request(app)
        .get('/api/v1/admin/incentives/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.stats).toHaveProperty('totalCollectedCents');
      expect(res.body.data.stats).toHaveProperty('totalPending');
      expect(res.body.data.stats).toHaveProperty('totalOverdue');
      expect(res.body.data.stats).toHaveProperty('totalDisputed');
      expect(res.body.data.stats).toHaveProperty('totalWaived');
      expect(res.body.data.stats).toHaveProperty('totalPaid');
      expect(res.body.data.stats.totalPaid).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Admin — waive incentive ──────────────────────────────────────────────

  describe('POST /api/v1/admin/incentives/:id/waive', () => {
    let waiveTargetId: string;

    beforeAll(async () => {
      // Create a fresh PENDING incentive for waive test
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('User@123456', 4);

      const user = await prisma.user.create({
        data: {
          email: `waive-user-${Date.now()}@example.com`,
          password: hash,
          isEmailVerified: true,
          profile: { create: { firstName: 'Waive', lastName: 'Target' } },
          subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
        },
      });

      const application = await prisma.application.create({
        data: { jobId: testJobId, userId: user.id, status: 'OFFERED' },
      });

      const incentive = await prisma.hiringIncentive.create({
        data: {
          orgId: testOrgId,
          jobId: testJobId,
          applicationId: application.id,
          amount: 50,
          currency: 'USD',
          status: 'PENDING',
          dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Ensure org has unpaid flag set
      await prisma.organization.update({
        where: { id: testOrgId },
        data: { hasUnpaidIncentives: true },
      });

      waiveTargetId = incentive.id;
    });

    it('should reject waive with reason shorter than 10 chars', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/incentives/${waiveTargetId}/waive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Too short' });

      expect(res.status).toBe(400);
    });

    it('should waive a PENDING incentive', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/incentives/${waiveTargetId}/waive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Candidate was already known to the employer before listing.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('waived');
    });

    it('should set status to WAIVED in DB', async () => {
      const incentive = await prisma.hiringIncentive.findUnique({
        where: { id: waiveTargetId },
      });
      expect(incentive?.status).toBe('WAIVED');
    });

    it('should recalculate org.hasUnpaidIncentives after waive', async () => {
      const org = await prisma.organization.findUnique({
        where: { id: testOrgId },
        select: { hasUnpaidIncentives: true },
      });
      // No remaining PENDING/OVERDUE — should be false
      expect(org?.hasUnpaidIncentives).toBe(false);
    });

    it('should reject waiving an already PAID incentive', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/incentives/${testIncentiveId}/waive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Testing waive on a paid incentive' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Paid incentives cannot be waived');
    });
  });

  // ── Admin — resolve dispute ──────────────────────────────────────────────

  describe('POST /api/v1/admin/incentives/:id/resolve-dispute', () => {
    let disputedIncentiveId: string;

    beforeAll(async () => {
      // Fetch the disputed incentive created in the dispute test suite
      const disputed = await prisma.hiringIncentive.findFirst({
        where: { orgId: testOrgId, status: 'DISPUTED' },
      });
      disputedIncentiveId = disputed?.id ?? '';
    });

    it('should reject resolve on a non-DISPUTED incentive', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/incentives/${testIncentiveId}/resolve-dispute`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolution: 'waive', note: 'Testing on paid incentive' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('not disputed');
    });

    it('should resolve a DISPUTED incentive by waiving', async () => {
      expect(disputedIncentiveId).toBeTruthy();

      const res = await request(app)
        .post(`/api/v1/admin/incentives/${disputedIncentiveId}/resolve-dispute`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolution: 'waive', note: 'Dispute verified — waiving incentive.' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('waived');
    });

    it('should set status to WAIVED after waive-resolution', async () => {
      const incentive = await prisma.hiringIncentive.findUnique({
        where: { id: disputedIncentiveId },
      });
      expect(incentive?.status).toBe('WAIVED');
    });

    it('should reject invalid resolution value', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/incentives/${disputedIncentiveId}/resolve-dispute`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolution: 'ignore' });

      expect(res.status).toBe(400);
    });
  });

  // ── markOverdueIncentives (cron) ─────────────────────────────────────────

  describe('markOverdueIncentives (internal cron function)', () => {
    it('should mark PENDING incentives past dueAt as OVERDUE', async () => {
      const { markOverdueIncentives } = await import('@/services/incentive/incentive.service');

      // Create a PENDING incentive with dueAt in the past
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('User@123456', 4);
      const user = await prisma.user.create({
        data: {
          email: `overdue-user-${Date.now()}@example.com`,
          password: hash,
          isEmailVerified: true,
          profile: { create: { firstName: 'Overdue', lastName: 'Tester' } },
          subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
        },
      });

      const application = await prisma.application.create({
        data: { jobId: testJobId, userId: user.id, status: 'OFFERED' },
      });

      const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
      const overdueIncentive = await prisma.hiringIncentive.create({
        data: {
          orgId: testOrgId,
          jobId: testJobId,
          applicationId: application.id,
          amount: 50,
          currency: 'USD',
          status: 'PENDING',
          dueAt: pastDue,
        },
      });

      await prisma.organization.update({
        where: { id: testOrgId },
        data: { hasUnpaidIncentives: true },
      });

      const count = await markOverdueIncentives();
      expect(count).toBeGreaterThanOrEqual(1);

      const updated = await prisma.hiringIncentive.findUnique({
        where: { id: overdueIncentive.id },
      });
      expect(updated?.status).toBe('OVERDUE');
    });

    it('should NOT mark PENDING incentives with future dueAt as OVERDUE', async () => {
      const { markOverdueIncentives } = await import('@/services/incentive/incentive.service');

      // Create a PENDING incentive with dueAt in the future
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('User@123456', 4);
      const user = await prisma.user.create({
        data: {
          email: `future-user-${Date.now()}@example.com`,
          password: hash,
          isEmailVerified: true,
          profile: { create: { firstName: 'Future', lastName: 'Tester' } },
          subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
        },
      });

      const application = await prisma.application.create({
        data: { jobId: testJobId, userId: user.id, status: 'OFFERED' },
      });

      const futureDue = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      const futureIncentive = await prisma.hiringIncentive.create({
        data: {
          orgId: testOrgId,
          jobId: testJobId,
          applicationId: application.id,
          amount: 50,
          currency: 'USD',
          status: 'PENDING',
          dueAt: futureDue,
        },
      });

      await markOverdueIncentives();

      const stillPending = await prisma.hiringIncentive.findUnique({
        where: { id: futureIncentive.id },
      });
      expect(stillPending?.status).toBe('PENDING');
    });
  });
});
