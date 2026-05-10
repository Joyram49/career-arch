import { prisma } from '@config/database';
import request from 'supertest';

import app from '@/app';

// ─────────────────────────────────────────────
// SHARED FIXTURES
// ─────────────────────────────────────────────

const testRunId = Date.now();

// Org fixture
const orgCreds = {
  email: `app-test-org-${testRunId}@example.com`,
  password: 'Org@123456',
  companyName: 'App Test Corp',
};

// User fixture
const userCreds = {
  email: `app-test-user-${testRunId}@example.com`,
  password: 'User@123456',
  firstName: 'App',
  lastName: 'Tester',
};

let orgToken: string;
let orgId: string;
let userToken: string;
let userId: string;
let publishedJobId: string;
let applicationId: string;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function setupOrg(): Promise<void> {
  await request(app).post('/api/v1/auth/org/register').send(orgCreds);
  const org = await prisma.organization.update({
    where: { email: orgCreds.email },
    data: {
      isEmailVerified: true,
      isApproved: true,
      stripeCustomerId: 'cus_app_test',
      stripeDefaultPaymentMethodId: 'pm_app_test',
      isPaymentMethodOnFile: true,
    },
  });
  orgId = org.id;
  await prisma.orgProfile.upsert({
    where: { orgId },
    update: {},
    create: { orgId, companyName: 'App Test Corp', industry: 'Technology' },
  });

  const loginRes = await request(app)
    .post('/api/v1/auth/org/login')
    .send({ email: orgCreds.email, password: orgCreds.password });
  orgToken = loginRes.body.data.accessToken as string;
}

async function setupUser(): Promise<void> {
  await request(app).post('/api/v1/auth/user/register').send(userCreds);
  const user = await prisma.user.update({
    where: { email: userCreds.email },
    data: { isEmailVerified: true },
  });
  userId = user.id;

  const loginRes = await request(app)
    .post('/api/v1/auth/user/login')
    .send({ email: userCreds.email, password: userCreds.password });
  userToken = loginRes.body.data.accessToken as string;
}

async function createAndPublishJob(title = 'Test Job For Applications'): Promise<string> {
  const createRes = await request(app)
    .post('/api/v1/org/jobs')
    .set('Authorization', `Bearer ${orgToken}`)
    .send({
      title,
      description:
        'We are seeking a talented engineer to join our team and contribute to building scalable backend systems.',
      jobType: 'FULL_TIME',
      isRemote: true,
      skills: ['Node.js', 'TypeScript'],
      vacancies: 5,
      requiredPlan: 'FREE',
      experienceLevel: 'Mid',
      category: 'Engineering',
    });

  const jobId = createRes.body.data.job.id as string;
  const _publishedJobSlug = createRes.body.data.job.slug as string;
  if (_publishedJobSlug.length === 0) {
    throw new Error('Published job slug is empty');
  }

  await request(app)
    .patch(`/api/v1/org/jobs/${jobId}/publish`)
    .set('Authorization', `Bearer ${orgToken}`);

  return jobId;
}

// ─────────────────────────────────────────────
// SETUP / TEARDOWN
// ─────────────────────────────────────────────

beforeAll(async () => {
  await setupOrg();
  await setupUser();
  publishedJobId = await createAndPublishJob();
});

afterAll(async () => {
  await prisma.hiringIncentive.deleteMany({ where: { orgId } });
  await prisma.application.deleteMany({ where: { job: { orgId } } });
  await prisma.savedJob.deleteMany({ where: { job: { orgId } } });
  await prisma.deletedJob.deleteMany({ where: { orgId } });
  await prisma.job.deleteMany({ where: { orgId } });
  await prisma.notification.deleteMany({ where: { OR: [{ orgId }, { userId }] } });
  await prisma.refreshToken.deleteMany({ where: { OR: [{ orgId }, { userId }] } });
  await prisma.orgProfile.deleteMany({ where: { orgId } });
  await prisma.organization.deleteMany({ where: { id: orgId } });
  await prisma.subscription.deleteMany({ where: { userId } });
  await prisma.userProfile.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────
// USER: APPLY
// ─────────────────────────────────────────────

describe('User Applications', () => {
  describe('POST /api/v1/applications', () => {
    it('should apply to a job successfully', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ jobId: publishedJobId, coverLetter: 'I am very interested in this role.' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.jobId).toBe(publishedJobId);
      expect(res.body.data.application.userId).toBe(userId);
      expect(res.body.data.application.status).toBe('PENDING');

      applicationId = res.body.data.application.id as string;
    });

    it('should reject duplicate application to the same job', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ jobId: publishedJobId });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already applied');
    });

    it('should reject applying to non-existent job', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ jobId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
    });

    it('should reject applying to a CLOSED job', async () => {
      const closedJobId = await createAndPublishJob('Job That Gets Closed');
      // close it
      await request(app)
        .patch(`/api/v1/org/jobs/${closedJobId}/close`)
        .set('Authorization', `Bearer ${orgToken}`);

      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ jobId: closedJobId });

      expect(res.status).toBe(400);
    });

    it('should reject without auth', async () => {
      const res = await request(app).post('/api/v1/applications').send({ jobId: publishedJobId });

      expect(res.status).toBe(401);
    });

    it('should reject with org token (only users can apply)', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ jobId: publishedJobId });

      expect(res.status).toBe(403);
    });

    it('should reject missing jobId', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should create notifications for org on new application', async () => {
      // Give async notification a moment
      await new Promise((r) => setTimeout(r, 150));

      const notification = await prisma.notification.findFirst({
        where: { orgId, recipientRole: 'ORGANIZATION' },
      });
      expect(notification).not.toBeNull();
    });
  });

  // ── List User Applications ─────────────────────────────────────────────────
  describe('GET /api/v1/applications', () => {
    it('should return paginated list of own applications', async () => {
      const res = await request(app)
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.applications)).toBe(true);
      expect(res.body.meta).toBeDefined();

      const apps = res.body.data.applications as { userId: string }[];
      expect(apps.every((a) => a.userId === userId)).toBe(true);
    });

    it('should filter by status=PENDING', async () => {
      const res = await request(app)
        .get('/api/v1/applications?status=PENDING')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      const apps = res.body.data.applications as { status: string }[];
      expect(apps.every((a) => a.status === 'PENDING')).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/v1/applications?page=1&limit=5')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(5);
    });

    it('should include job details in response', async () => {
      const res = await request(app)
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      if ((res.body.data.applications as unknown[]).length > 0) {
        const appFind = (res.body.data.applications as { job?: unknown }[])[0] as { job?: unknown };
        expect(appFind.job).toBeDefined();
      }
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/applications');
      expect(res.status).toBe(401);
    });
  });

  // ── Get Single Application ─────────────────────────────────────────────────
  describe('GET /api/v1/applications/:id', () => {
    it('should return application detail', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.application.id).toBe(applicationId);
      expect(res.body.data.application.job).toBeDefined();
    });

    it('should return 404 for non-existent application', async () => {
      const res = await request(app)
        .get('/api/v1/applications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });

    it('should not allow user to view another user application', async () => {
      // Create a second user
      const user2Email = `app-user2-${testRunId}@example.com`;
      await request(app).post('/api/v1/auth/user/register').send({
        email: user2Email,
        password: 'Test@123456',
        firstName: 'Other',
        lastName: 'User',
      });
      await prisma.user.update({
        where: { email: user2Email },
        data: { isEmailVerified: true },
      });
      const user2Login = await request(app)
        .post('/api/v1/auth/user/login')
        .send({ email: user2Email, password: 'Test@123456' });
      const user2Token = user2Login.body.data.accessToken as string;

      const res = await request(app)
        .get(`/api/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);

      const user2 = await prisma.user.findUnique({ where: { email: user2Email } });
      if (user2) {
        await prisma.subscription.deleteMany({ where: { userId: user2.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: user2.id } });
        await prisma.userProfile.deleteMany({ where: { userId: user2.id } });
        await prisma.user.deleteMany({ where: { id: user2.id } });
      }
    });
  });

  // ── Withdraw Application ───────────────────────────────────────────────────
  describe('DELETE /api/v1/applications/:id', () => {
    it('should withdraw (delete) a PENDING application', async () => {
      // Create a fresh application to withdraw
      const secondJob = await createAndPublishJob('Second Job For Withdrawal Test');
      const applyRes = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ jobId: secondJob });

      const withdrawId = applyRes.body.data.application.id as string;

      const res = await request(app)
        .delete(`/api/v1/applications/${withdrawId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('withdrawn');

      // Verify deleted from DB
      const deleted = await prisma.application.findUnique({ where: { id: withdrawId } });
      expect(deleted).toBeNull();
    });

    it('should reject withdrawing a SHORTLISTED application', async () => {
      // Force status to SHORTLISTED
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: 'SHORTLISTED' },
      });

      const res = await request(app)
        .delete(`/api/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('withdraw');

      // Reset back
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: 'PENDING' },
      });
    });

    it('should return 404 for non-existent application', async () => {
      const res = await request(app)
        .delete('/api/v1/applications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).delete(`/api/v1/applications/${applicationId}`);
      expect(res.status).toBe(401);
    });
  });
});

// ─────────────────────────────────────────────
// ORG: APPLICATION MANAGEMENT
// ─────────────────────────────────────────────

describe('Org Application Management', () => {
  // ── List Applications for Org ──────────────────────────────────────────────
  describe('GET /api/v1/org/applications', () => {
    it('should return list of applications across all org jobs', async () => {
      const res = await request(app)
        .get('/api/v1/org/applications')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.applications)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should filter by status=PENDING', async () => {
      const res = await request(app)
        .get('/api/v1/org/applications?status=PENDING')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      const apps = res.body.data.applications as { status: string }[];
      expect(apps.every((a) => a.status === 'PENDING')).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/v1/org/applications?page=1&limit=5')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(5);
    });

    it('should include applicant profile', async () => {
      const res = await request(app)
        .get('/api/v1/org/applications')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      if ((res.body.data.applications as unknown[]).length > 0) {
        const appFind = (res.body.data.applications as { user?: unknown }[])[0] as {
          user?: unknown;
        };
        expect(appFind.user).toBeDefined();
      }
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/org/applications');
      expect(res.status).toBe(401);
    });

    it('should return 403 with user token', async () => {
      const res = await request(app)
        .get('/api/v1/org/applications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ── Get Applications for a Specific Job ───────────────────────────────────
  describe('GET /api/v1/org/jobs/:jobId/applications', () => {
    it('should return applications for a specific job', async () => {
      const res = await request(app)
        .get(`/api/v1/org/jobs/${publishedJobId}/applications`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.applications)).toBe(true);

      const apps = res.body.data.applications as { jobId: string }[];
      expect(apps.every((a) => a.jobId === publishedJobId)).toBe(true);
    });

    it('should return 404 for job not owned by org', async () => {
      const res = await request(app)
        .get('/api/v1/org/jobs/00000000-0000-0000-0000-000000000000/applications')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── Get Single Application (Org) ───────────────────────────────────────────
  describe('GET /api/v1/org/applications/:id', () => {
    it('should return full application detail', async () => {
      const res = await request(app)
        .get(`/api/v1/org/applications/${applicationId}`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.application.id).toBe(applicationId);
      expect(res.body.data.application.user).toBeDefined();
      expect(res.body.data.application.job).toBeDefined();
    });

    it('should return 404 for application not belonging to org', async () => {
      const res = await request(app)
        .get('/api/v1/org/applications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── Update Application Status ──────────────────────────────────────────────
  describe('PATCH /api/v1/org/applications/:id/status', () => {
    it('should update status from PENDING to UNDER_REVIEW', async () => {
      const res = await request(app)
        .patch(`/api/v1/org/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ status: 'UNDER_REVIEW' });

      expect(res.status).toBe(200);
      expect(res.body.data.application.status).toBe('UNDER_REVIEW');
    });

    it('should update status from UNDER_REVIEW to SHORTLISTED', async () => {
      const res = await request(app)
        .patch(`/api/v1/org/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ status: 'SHORTLISTED' });

      expect(res.status).toBe(200);
      expect(res.body.data.application.status).toBe('SHORTLISTED');
    });

    it('should update status from SHORTLISTED to INTERVIEW_SCHEDULED', async () => {
      const res = await request(app)
        .patch(`/api/v1/org/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ status: 'INTERVIEW_SCHEDULED' });

      expect(res.status).toBe(200);
      expect(res.body.data.application.status).toBe('INTERVIEW_SCHEDULED');
    });

    it('should update status from INTERVIEW_SCHEDULED to OFFERED', async () => {
      const res = await request(app)
        .patch(`/api/v1/org/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ status: 'OFFERED' });

      expect(res.status).toBe(200);
      expect(res.body.data.application.status).toBe('OFFERED');
    });

    it('should reject invalid status value', async () => {
      const res = await request(app)
        .patch(`/api/v1/org/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
    });

    it('should reject missing status field', async () => {
      const res = await request(app)
        .patch(`/api/v1/org/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should send user notification on status update', async () => {
      await new Promise((r) => setTimeout(r, 150));

      const notification = await prisma.notification.findFirst({
        where: { userId, recipientRole: 'USER' },
      });
      expect(notification).not.toBeNull();
    });

    it('should create HiringIncentive when status set to HIRED', async () => {
      const res = await request(app)
        .patch(`/api/v1/org/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ status: 'HIRED' });

      expect(res.status).toBe(200);
      expect(res.body.data.application.status).toBe('HIRED');

      // Wait for side effects
      await new Promise((r) => setTimeout(r, 200));

      const incentive = await prisma.hiringIncentive.findUnique({
        where: { applicationId },
      });
      expect(incentive).not.toBeNull();
      expect(incentive?.status).toBe('PENDING');
      expect(incentive?.amount).toBe(5000);

      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      expect(org?.hasUnpaidIncentives).toBe(true);
    });

    it('should reject re-updating status of HIRED application', async () => {
      const res = await request(app)
        .patch(`/api/v1/org/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ status: 'UNDER_REVIEW' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('HIRED');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .patch(`/api/v1/org/applications/${applicationId}/status`)
        .send({ status: 'UNDER_REVIEW' });

      expect(res.status).toBe(401);
    });

    it('should return 403 with user token', async () => {
      const res = await request(app)
        .patch(`/api/v1/org/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'UNDER_REVIEW' });

      expect(res.status).toBe(403);
    });
  });

  // ── Plan Gating: Apply Limit ───────────────────────────────────────────────
  describe('Feature gate: apply limit (FREE plan)', () => {
    it('should reject when FREE plan monthly apply limit is reached', async () => {
      // Force the apply counter to the limit on FREE plan (5)
      await prisma.subscription.updateMany({
        where: { userId },
        data: { applyCountThisMonth: 5 },
      });

      // Ensure subscription plan is FREE
      const plan = await prisma.planCatalogue.findFirst({ where: { key: 'FREE' } });
      if (plan) {
        await prisma.subscription.updateMany({
          where: { userId },
          data: { plan: 'FREE', stripeSubscriptionId: plan.stripeProductId },
        });
      }

      const freshJobId = await createAndPublishJob('Apply Limit Test Job');

      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ jobId: freshJobId });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('limit');

      // Reset
      await prisma.subscription.updateMany({
        where: { userId },
        data: { applyCountThisMonth: 0 },
      });
    });
  });
});
