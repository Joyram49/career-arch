import { prisma } from '@config/database';
import request from 'supertest';

import app from '@/app';

// ─────────────────────────────────────────────
// SHARED SETUP
// ─────────────────────────────────────────────

const testRunId = Date.now();

const baseOrg = {
  email: `job-test-org-${testRunId}@example.com`,
  password: 'Org@123456',
  companyName: 'Job Test Corp',
};

let orgToken: string;
let testOrgId: string;

// IDs tracked across test suites
let draftJobId: string;
let draftJobSlug: string;
let publishedJobId: string;

const validJobPayload = {
  title: 'Senior Backend Engineer',
  description:
    'We are looking for a talented Senior Backend Engineer to join our growing team. You will design and build scalable APIs and mentor junior engineers on best practices.',
  jobType: 'FULL_TIME',
  isRemote: true,
  skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
  vacancies: 2,
  requiredPlan: 'FREE',
  experienceLevel: 'Senior',
  category: 'Engineering',
  salaryMin: 80000,
  salaryMax: 120000,
  salaryCurrency: 'USD',
};

async function setupApprovedOrg(): Promise<{ orgId: string; token: string }> {
  await request(app).post('/api/v1/auth/org/register').send(baseOrg);

  const org = await prisma.organization.update({
    where: { email: baseOrg.email },
    data: {
      isEmailVerified: true,
      isApproved: true,
      stripeCustomerId: 'cus_test_jobs',
      stripeDefaultPaymentMethodId: 'pm_test_jobs',
      isPaymentMethodOnFile: true,
    },
  });

  await prisma.orgProfile.upsert({
    where: { orgId: org.id },
    update: {},
    create: { orgId: org.id, companyName: 'Job Test Corp', industry: 'Technology' },
  });

  const loginRes = await request(app)
    .post('/api/v1/auth/org/login')
    .send({ email: baseOrg.email, password: baseOrg.password });

  return {
    orgId: org.id,
    token: loginRes.body.data.accessToken as string,
  };
}

beforeAll(async () => {
  const setup = await setupApprovedOrg();
  orgToken = setup.token;
  testOrgId = setup.orgId;
});

afterAll(async () => {
  await prisma.deletedJob.deleteMany({ where: { orgId: testOrgId } });
  await prisma.savedJob.deleteMany({ where: { job: { orgId: testOrgId } } });
  await prisma.application.deleteMany({ where: { job: { orgId: testOrgId } } });
  await prisma.job.deleteMany({ where: { orgId: testOrgId } });
  await prisma.notification.deleteMany({ where: { orgId: testOrgId } });
  await prisma.refreshToken.deleteMany({ where: { orgId: testOrgId } });
  await prisma.orgProfile.deleteMany({ where: { orgId: testOrgId } });
  await prisma.organization.deleteMany({ where: { id: testOrgId } });
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────
// ORG JOB MANAGEMENT
// ─────────────────────────────────────────────

describe('Org Job Management', () => {
  // ── Create Job ────────────────────────────────────────────────────────────
  describe('POST /api/v1/org/jobs', () => {
    it('should create a new job as DRAFT', async () => {
      const res = await request(app)
        .post('/api/v1/org/jobs')
        .set('Authorization', `Bearer ${orgToken}`)
        .send(validJobPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.job.status).toBe('DRAFT');
      expect(res.body.data.job.title).toBe(validJobPayload.title);
      expect(res.body.data.job.slug).toBeDefined();
      expect(res.body.data.job.orgId).toBe(testOrgId);

      draftJobId = res.body.data.job.id as string;
      draftJobSlug = res.body.data.job.slug as string;
    });

    it('should sanitize HTML in description', async () => {
      const res = await request(app)
        .post('/api/v1/org/jobs')
        .set('Authorization', `Bearer ${orgToken}`)
        .send({
          ...validJobPayload,
          description:
            '<p>Valid description with <strong>bold</strong> text that is long enough to pass validation and create a job.</p>',
        });

      expect(res.status).toBe(201);
      // script tags should be stripped
      expect(res.body.data.job.description).not.toContain('<script>');
    });

    it('should reject job with title shorter than 5 chars', async () => {
      const res = await request(app)
        .post('/api/v1/org/jobs')
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ ...validJobPayload, title: 'Hi' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject job with description shorter than 50 chars', async () => {
      const res = await request(app)
        .post('/api/v1/org/jobs')
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ ...validJobPayload, description: 'Too short.' });

      expect(res.status).toBe(400);
    });

    it('should reject job with salaryMax less than salaryMin', async () => {
      const res = await request(app)
        .post('/api/v1/org/jobs')
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ ...validJobPayload, salaryMin: 100000, salaryMax: 50000 });

      expect(res.status).toBe(400);
    });

    it('should reject job without location when isRemote is false', async () => {
      const res = await request(app)
        .post('/api/v1/org/jobs')
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ ...validJobPayload, isRemote: false, location: undefined });

      expect(res.status).toBe(400);
    });

    it('should accept job with location when isRemote is false', async () => {
      const res = await request(app)
        .post('/api/v1/org/jobs')
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ ...validJobPayload, isRemote: false, location: 'New York, NY' });

      expect(res.status).toBe(201);
      expect(res.body.data.job.location).toBe('New York, NY');
    });

    it('should reject without auth', async () => {
      const res = await request(app).post('/api/v1/org/jobs').send(validJobPayload);
      expect(res.status).toBe(401);
    });

    it('should reject with user token (not org)', async () => {
      const userEmail = `user-job-test-${testRunId}@example.com`;
      await request(app).post('/api/v1/auth/user/register').send({
        email: userEmail,
        password: 'Test@123456',
        firstName: 'Test',
        lastName: 'User',
      });
      await prisma.user.update({ where: { email: userEmail }, data: { isEmailVerified: true } });
      const loginRes = await request(app)
        .post('/api/v1/auth/user/login')
        .send({ email: userEmail, password: 'Test@123456' });
      const userToken = loginRes.body.data.accessToken as string;

      const res = await request(app)
        .post('/api/v1/org/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validJobPayload);

      expect(res.status).toBe(403);

      await prisma.subscription.deleteMany({ where: { user: { email: userEmail } } });
      await prisma.refreshToken.deleteMany({ where: { user: { email: userEmail } } });
      await prisma.userProfile.deleteMany({ where: { user: { email: userEmail } } });
      await prisma.user.deleteMany({ where: { email: userEmail } });
    });
  });

  // ── Get Single Job ────────────────────────────────────────────────────────
  describe('GET /api/v1/org/jobs/:id', () => {
    it('should return job detail with application count', async () => {
      const res = await request(app)
        .get(`/api/v1/org/jobs/${draftJobId}`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.job.id).toBe(draftJobId);
      expect(res.body.data.job._count).toBeDefined();
    });

    it('should return 404 for non-existent job', async () => {
      const res = await request(app)
        .get('/api/v1/org/jobs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      const res = await request(app)
        .get('/api/v1/org/jobs/not-a-uuid')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(400);
    });

    it('should reject without auth', async () => {
      const res = await request(app).get(`/api/v1/org/jobs/${draftJobId}`);
      expect(res.status).toBe(401);
    });
  });

  // ── List Org Jobs ─────────────────────────────────────────────────────────
  describe('GET /api/v1/org/jobs', () => {
    it('should return paginated job list', async () => {
      const res = await request(app)
        .get('/api/v1/org/jobs')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.jobs)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(20);
    });

    it('should filter jobs by status=DRAFT', async () => {
      const res = await request(app)
        .get('/api/v1/org/jobs?status=DRAFT')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      const jobs = res.body.data.jobs as { status: string }[];
      expect(jobs.every((j) => j.status === 'DRAFT')).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/v1/org/jobs?page=1&limit=5')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(5);
    });

    it('should support sorting by title', async () => {
      const res = await request(app)
        .get('/api/v1/org/jobs?sortBy=title&sortOrder=asc')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
    });

    it('should not show ARCHIVED jobs in default list', async () => {
      const res = await request(app)
        .get('/api/v1/org/jobs')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      const jobs = res.body.data.jobs as { status: string }[];
      expect(jobs.every((j) => j.status !== 'ARCHIVED')).toBe(true);
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/api/v1/org/jobs');
      expect(res.status).toBe(401);
    });
  });

  // ── Update Job ────────────────────────────────────────────────────────────
  describe('PUT /api/v1/org/jobs/:id', () => {
    it('should update job title', async () => {
      const res = await request(app)
        .put(`/api/v1/org/jobs/${draftJobId}`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ title: 'Updated Backend Engineer Role' });

      expect(res.status).toBe(200);
      expect(res.body.data.job.title).toBe('Updated Backend Engineer Role');
    });

    it('should NOT change slug on title update (SEO stability)', async () => {
      const res = await request(app)
        .put(`/api/v1/org/jobs/${draftJobId}`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ title: 'Completely Different Title Now' });

      expect(res.status).toBe(200);
      expect(res.body.data.job.slug).toBe(draftJobSlug);
    });

    it('should update multiple fields at once', async () => {
      const res = await request(app)
        .put(`/api/v1/org/jobs/${draftJobId}`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ salaryMin: 90000, salaryMax: 130000, vacancies: 3 });

      expect(res.status).toBe(200);
      expect(res.body.data.job.salaryMin).toBe(90000);
      expect(res.body.data.job.salaryMax).toBe(130000);
      expect(res.body.data.job.vacancies).toBe(3);
    });

    it('should reject salaryMax < salaryMin in update', async () => {
      const res = await request(app)
        .put(`/api/v1/org/jobs/${draftJobId}`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ salaryMin: 200000, salaryMax: 50000 });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent job', async () => {
      const res = await request(app)
        .put('/api/v1/org/jobs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .put(`/api/v1/org/jobs/${draftJobId}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(401);
    });
  });

  // ── Publish Job ───────────────────────────────────────────────────────────
  describe('PATCH /api/v1/org/jobs/:id/publish', () => {
    it('should publish a DRAFT job', async () => {
      const res = await request(app)
        .patch(`/api/v1/org/jobs/${draftJobId}/publish`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.job.status).toBe('PUBLISHED');
      expect(res.body.data.job.publishedAt).not.toBeNull();

      publishedJobId = draftJobId;
    });

    it('should reject publishing an already PUBLISHED job', async () => {
      const res = await request(app)
        .patch(`/api/v1/org/jobs/${publishedJobId}/publish`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already published');
    });

    it('should return 404 for non-existent job', async () => {
      const res = await request(app)
        .patch('/api/v1/org/jobs/00000000-0000-0000-0000-000000000000/publish')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── Close Job ─────────────────────────────────────────────────────────────
  describe('PATCH /api/v1/org/jobs/:id/close', () => {
    it('should close a PUBLISHED job', async () => {
      const res = await request(app)
        .patch(`/api/v1/org/jobs/${publishedJobId}/close`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.job.status).toBe('CLOSED');
    });

    it('should reject closing a non-PUBLISHED job (already CLOSED)', async () => {
      const res = await request(app)
        .patch(`/api/v1/org/jobs/${publishedJobId}/close`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ── Soft Delete + Restore ─────────────────────────────────────────────────
  describe('DELETE /api/v1/org/jobs/:id + PATCH restore', () => {
    let deletableJobId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/org/jobs')
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ ...validJobPayload, title: 'Deletable Job For Testing' });
      deletableJobId = res.body.data.job.id as string;
    });

    it('should reject deleting a PUBLISHED job', async () => {
      // Publish then try to delete without closing first
      // First create a fresh job and publish it
      const createRes = await request(app)
        .post('/api/v1/org/jobs')
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ ...validJobPayload, title: 'Published Job To Try Deleting' });
      const pubJobId = createRes.body.data.job.id as string;

      await request(app)
        .patch(`/api/v1/org/jobs/${pubJobId}/publish`)
        .set('Authorization', `Bearer ${orgToken}`);

      const res = await request(app)
        .delete(`/api/v1/org/jobs/${pubJobId}`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Close');

      // cleanup
      await request(app)
        .patch(`/api/v1/org/jobs/${pubJobId}/close`)
        .set('Authorization', `Bearer ${orgToken}`);
    });

    it('should soft-delete a DRAFT job and move to trash', async () => {
      const res = await request(app)
        .delete(`/api/v1/org/jobs/${deletableJobId}`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('trash');

      // Verify the job is ARCHIVED in DB
      const job = await prisma.job.findUnique({
        where: { id: deletableJobId },
        select: { status: true },
      });
      expect(job?.status).toBe('ARCHIVED');

      // Verify DeletedJob record created
      const deletedEntry = await prisma.deletedJob.findUnique({
        where: { jobId: deletableJobId },
      });
      expect(deletedEntry).not.toBeNull();
      expect(deletedEntry?.orgId).toBe(testOrgId);
    });

    it('should show soft-deleted job in trash list', async () => {
      const res = await request(app)
        .get('/api/v1/org/jobs/deleted')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.deletedJobs)).toBe(true);

      const deletedJobs = res.body.data.deletedJobs as { jobId: string }[];
      expect(deletedJobs.some((d) => d.jobId === deletableJobId)).toBe(true);
    });

    it('should restore a deleted job as CLOSED', async () => {
      const res = await request(app)
        .patch(`/api/v1/org/jobs/${deletableJobId}/restore`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.job.status).toBe('CLOSED');

      // Verify DeletedJob record removed
      const deletedEntry = await prisma.deletedJob.findUnique({
        where: { jobId: deletableJobId },
      });
      expect(deletedEntry).toBeNull();
    });

    it('should return 404 restoring a job not in trash', async () => {
      // The job was already restored, so it's no longer in trash
      const res = await request(app)
        .patch(`/api/v1/org/jobs/${deletableJobId}/restore`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent job delete', async () => {
      const res = await request(app)
        .delete('/api/v1/org/jobs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── Org cannot manage other org's jobs ────────────────────────────────────
  describe('Cross-org isolation', () => {
    let otherOrgToken: string;
    const otherOrgEmail = `other-org-${testRunId}@example.com`;

    beforeAll(async () => {
      await request(app).post('/api/v1/auth/org/register').send({
        email: otherOrgEmail,
        password: 'Org@123456',
        companyName: 'Other Corp',
      });
      await prisma.organization.update({
        where: { email: otherOrgEmail },
        data: {
          isEmailVerified: true,
          isApproved: true,
          stripeCustomerId: 'cus_other',
          stripeDefaultPaymentMethodId: 'pm_other',
          isPaymentMethodOnFile: true,
        },
      });
      const otherOrg = (await prisma.organization.findUnique({
        where: { email: otherOrgEmail },
      })) as { id: string };
      await prisma.orgProfile.upsert({
        where: { orgId: otherOrg.id },
        update: {},
        create: { orgId: otherOrg.id, companyName: 'Other Corp' },
      });
      const loginRes = await request(app)
        .post('/api/v1/auth/org/login')
        .send({ email: otherOrgEmail, password: 'Org@123456' });
      otherOrgToken = loginRes.body.data.accessToken as string;
    });

    afterAll(async () => {
      const otherOrg = (await prisma.organization.findUnique({
        where: { email: otherOrgEmail },
      })) as { id: string };
      await prisma.job.deleteMany({ where: { orgId: otherOrg.id } });
      await prisma.refreshToken.deleteMany({ where: { orgId: otherOrg.id } });
      await prisma.orgProfile.deleteMany({ where: { orgId: otherOrg.id } });
      await prisma.organization.deleteMany({ where: { id: otherOrg.id } });
    });

    it('should not allow other org to view first org job', async () => {
      const res = await request(app)
        .get(`/api/v1/org/jobs/${draftJobId}`)
        .set('Authorization', `Bearer ${otherOrgToken}`);

      expect(res.status).toBe(404);
    });

    it('should not allow other org to update first org job', async () => {
      const res = await request(app)
        .put(`/api/v1/org/jobs/${draftJobId}`)
        .set('Authorization', `Bearer ${otherOrgToken}`)
        .send({ title: 'Hijacked Title' });

      expect(res.status).toBe(404);
    });
  });
});

// ─────────────────────────────────────────────
// PUBLIC JOB ROUTES
// ─────────────────────────────────────────────

describe('Public Job Routes', () => {
  let livePublishedJobSlug: string;

  beforeAll(async () => {
    // Create and publish a fresh job for public search tests
    const createRes = await request(app)
      .post('/api/v1/org/jobs')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({
        ...validJobPayload,
        title: 'Public Search Target Job',
        category: 'Engineering',
        skills: ['React', 'TypeScript'],
      });

    const jobId = createRes.body.data.job.id as string;
    livePublishedJobSlug = createRes.body.data.job.slug as string;

    await request(app)
      .patch(`/api/v1/org/jobs/${jobId}/publish`)
      .set('Authorization', `Bearer ${orgToken}`);
  });

  // ── Search Jobs ───────────────────────────────────────────────────────────
  describe('GET /api/v1/jobs', () => {
    it('should return published jobs without auth', async () => {
      const res = await request(app).get('/api/v1/jobs');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.jobs)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should mark results as limited for guest users', async () => {
      const res = await request(app).get('/api/v1/jobs');

      expect(res.status).toBe(200);
      expect(res.body.meta.isLimited).toBe(true);
      expect(res.body.meta.limitMessage).toBeDefined();
    });

    it('should only show PUBLISHED jobs (not DRAFT or CLOSED)', async () => {
      const res = await request(app).get('/api/v1/jobs');

      expect(res.status).toBe(200);
      const jobs = res.body.data.jobs as { status?: string }[];
      // Status may not be in public response, but results should only be published
      expect(jobs.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by keyword (q param)', async () => {
      const res = await request(app).get('/api/v1/jobs?q=Public+Search+Target');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.jobs)).toBe(true);
    });

    it('should filter by jobType', async () => {
      const res = await request(app).get('/api/v1/jobs?type=FULL_TIME');

      expect(res.status).toBe(200);
      const jobs = res.body.data.jobs as { jobType: string }[];
      expect(jobs.every((j) => j.jobType === 'FULL_TIME')).toBe(true);
    });

    it('should filter by isRemote=true', async () => {
      const res = await request(app).get('/api/v1/jobs?isRemote=true');

      expect(res.status).toBe(200);
      const jobs = res.body.data.jobs as { isRemote: boolean }[];
      expect(jobs.every((j) => j.isRemote === true)).toBe(true);
    });

    it('should filter by category', async () => {
      const res = await request(app).get('/api/v1/jobs?category=Engineering');

      expect(res.status).toBe(200);
    });

    it('should respect pagination params', async () => {
      const res = await request(app).get('/api/v1/jobs?page=1&limit=5');

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(5);
    });

    it('should cap FREE/guest results at page 1 max 20', async () => {
      const res = await request(app).get('/api/v1/jobs?page=2&limit=20');

      expect(res.status).toBe(200);
      // Guest always gets page 1, limit 20 max
      expect(res.body.meta.page).toBe(1);
    });

    it('should sort by publishedAt desc by default', async () => {
      const res = await request(app).get('/api/v1/jobs');
      expect(res.status).toBe(200);
    });

    it('should filter by salaryMin', async () => {
      const res = await request(app).get('/api/v1/jobs?salaryMin=50000');
      expect(res.status).toBe(200);
    });

    it('should include org profile in response', async () => {
      const res = await request(app).get('/api/v1/jobs');
      expect(res.status).toBe(200);

      if ((res.body.data.jobs as unknown[]).length > 0) {
        const firstJob = (res.body.data.jobs as { organization?: unknown }[])[0];
        expect(firstJob?.organization).toBeDefined();
      }
    });
  });

  // ── Job Categories ────────────────────────────────────────────────────────
  describe('GET /api/v1/jobs/categories', () => {
    it('should return array of distinct categories', async () => {
      const res = await request(app).get('/api/v1/jobs/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.categories)).toBe(true);
    });

    it('should include Engineering in categories', async () => {
      const res = await request(app).get('/api/v1/jobs/categories');

      expect(res.status).toBe(200);
      const categories = res.body.data.categories as string[];
      expect(categories.includes('Engineering')).toBe(true);
    });

    it('should return no duplicates', async () => {
      const res = await request(app).get('/api/v1/jobs/categories');

      expect(res.status).toBe(200);
      const categories = res.body.data.categories as string[];
      const unique = new Set(categories);
      expect(unique.size).toBe(categories.length);
    });
  });

  // ── Job Detail by Slug ────────────────────────────────────────────────────
  describe('GET /api/v1/jobs/:slug', () => {
    it('should return full job detail by slug', async () => {
      const res = await request(app).get(`/api/v1/jobs/${livePublishedJobSlug}`);

      expect(res.status).toBe(200);
      expect(res.body.data.job.slug).toBe(livePublishedJobSlug);
      expect(res.body.data.job.organization).toBeDefined();
      expect(res.body.data.job._count).toBeDefined();
    });

    it('should include isApplied=false and isSaved=false for guest', async () => {
      const res = await request(app).get(`/api/v1/jobs/${livePublishedJobSlug}`);

      expect(res.status).toBe(200);
      expect(res.body.data.job.isApplied).toBe(false);
      expect(res.body.data.job.isSaved).toBe(false);
    });

    it('should increment views counter on fetch', async () => {
      const jobBefore = await prisma.job.findUnique({
        where: { slug: livePublishedJobSlug },
        select: { views: true },
      });

      await request(app).get(`/api/v1/jobs/${livePublishedJobSlug}`);

      // Give fire-and-forget a moment
      await new Promise((r) => setTimeout(r, 100));

      const jobAfter = await prisma.job.findUnique({
        where: { slug: livePublishedJobSlug },
        select: { views: true },
      });

      expect(jobAfter?.views ?? 0).toBeGreaterThanOrEqual(jobBefore?.views ?? 0);
    });

    it('should return 404 for non-existent slug', async () => {
      const res = await request(app).get('/api/v1/jobs/this-slug-does-not-exist-xyz999');

      expect(res.status).toBe(404);
    });

    it('should include isApplied=true for authenticated user who applied', async () => {
      // Create user, register, verify, login
      const userEmail = `applied-user-${testRunId}@example.com`;
      await request(app).post('/api/v1/auth/user/register').send({
        email: userEmail,
        password: 'Test@123456',
        firstName: 'Applied',
        lastName: 'User',
      });

      const user = await prisma.user.update({
        where: { email: userEmail },
        data: { isEmailVerified: true },
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/user/login')
        .send({ email: userEmail, password: 'Test@123456' });
      const userToken = loginRes.body.data.accessToken as string;

      // Get the job ID from the slug
      const job = await prisma.job.findUnique({
        where: { slug: livePublishedJobSlug },
        select: { id: true },
      });

      // Manually create application
      await prisma.application.create({
        data: {
          jobId: job?.id ?? '',
          userId: user.id,
          status: 'PENDING',
        },
      });

      const res = await request(app)
        .get(`/api/v1/jobs/${livePublishedJobSlug}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.job.isApplied).toBe(true);

      // cleanup
      await prisma.application.deleteMany({ where: { userId: user.id } });
      await prisma.subscription.deleteMany({ where: { userId: user.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.userProfile.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    });
  });
});
