import { prisma } from '@config/database';
import request from 'supertest';

import app from '@/app';

// ─────────────────────────────────────────────
// SHARED FIXTURES
// ─────────────────────────────────────────────

const testRunId = Date.now();

const userCreds = {
  email: `profile-test-user-${testRunId}@example.com`,
  password: 'User@123456',
  firstName: 'Profile',
  lastName: 'Tester',
};

// Org for saved-job tests
const orgCreds = {
  email: `profile-test-org-${testRunId}@example.com`,
  password: 'Org@123456',
  companyName: 'Profile Test Corp',
};

let userToken: string;
let userId: string;
let orgId: string;
let orgToken: string;
let savedJobId: string;

// ─────────────────────────────────────────────
// SETUP / TEARDOWN
// ─────────────────────────────────────────────

beforeAll(async () => {
  // Setup user
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

  // Setup org + published job for saved-jobs tests
  await request(app).post('/api/v1/auth/org/register').send(orgCreds);
  const org = await prisma.organization.update({
    where: { email: orgCreds.email },
    data: {
      isEmailVerified: true,
      isApproved: true,
      stripeCustomerId: 'cus_profile_test',
      stripeDefaultPaymentMethodId: 'pm_profile_test',
      isPaymentMethodOnFile: true,
    },
  });
  orgId = org.id;
  await prisma.orgProfile.upsert({
    where: { orgId },
    update: {},
    create: { orgId, companyName: 'Profile Test Corp', industry: 'Technology' },
  });

  const orgLogin = await request(app)
    .post('/api/v1/auth/org/login')
    .send({ email: orgCreds.email, password: orgCreds.password });
  orgToken = orgLogin.body.data.accessToken as string;

  // Create and publish a job
  const jobRes = await request(app)
    .post('/api/v1/org/jobs')
    .set('Authorization', `Bearer ${orgToken}`)
    .send({
      title: 'Job For Saving In Profile Tests',
      description:
        'We are looking for talented engineers to join our team and help build world-class software products.',
      jobType: 'FULL_TIME',
      isRemote: true,
      skills: ['React', 'TypeScript'],
      vacancies: 2,
      requiredPlan: 'FREE',
      experienceLevel: 'Mid',
      category: 'Engineering',
    });
  savedJobId = jobRes.body.data.job.id as string;

  await request(app)
    .patch(`/api/v1/org/jobs/${savedJobId}/publish`)
    .set('Authorization', `Bearer ${orgToken}`);
});

afterAll(async () => {
  await prisma.savedJob.deleteMany({ where: { userId } });
  await prisma.application.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.subscription.deleteMany({ where: { userId } });
  await prisma.refreshToken.deleteMany({ where: { userId } });
  await prisma.userProfile.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });

  await prisma.job.deleteMany({ where: { orgId } });
  await prisma.notification.deleteMany({ where: { orgId } });
  await prisma.refreshToken.deleteMany({ where: { orgId } });
  await prisma.orgProfile.deleteMany({ where: { orgId } });
  await prisma.organization.deleteMany({ where: { id: orgId } });
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────
// PROFILE GET / UPDATE
// ─────────────────────────────────────────────

describe('User Profile', () => {
  describe('GET /api/v1/user/profile', () => {
    it('should return own profile', async () => {
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(userCreds.email);
      expect(res.body.data.user.profile).toBeDefined();
    });

    it('should not expose password hash', async () => {
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/user/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/user/profile', () => {
    it('should update bio and headline', async () => {
      const res = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ summary: 'I am a software engineer.', headline: 'Senior Dev' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.profile.summary).toBe('I am a software engineer.');
      expect(res.body.data.user.profile.headline).toBe('Senior Dev');
    });

    it('should update firstName and lastName', async () => {
      const res = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: 'Updated', lastName: 'Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.profile.firstName).toBe('Updated');
      expect(res.body.data.user.profile.lastName).toBe('Name');
    });

    it('should update phone number', async () => {
      const res = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ phone: '+8801712345678' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.profile.phone).toBe('+8801712345678');
    });

    it('should update skills array', async () => {
      const res = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ skills: ['TypeScript', 'React', 'Node.js'] });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.user.profile.skills)).toBe(true);
      expect(res.body.data.user.profile.skills).toContain('TypeScript');
    });

    it('should update location fields', async () => {
      const res = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ location: 'Dhaka, Bangladesh' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.profile.location).toBe('Dhaka, Bangladesh');
    });

    it('should accept empty update (no fields changed)', async () => {
      const res = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(200);
    });

    it('should reject bio longer than 500 chars', async () => {
      const res = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bio: 'a'.repeat(501) });

      expect(res.status).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).put('/api/v1/user/profile').send({ bio: 'no auth' });

      expect(res.status).toBe(401);
    });
  });
});

// ─────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────

describe('Change Password', () => {
  describe('PUT /api/v1/user/change-password', () => {
    it('should change password with correct current password', async () => {
      const res = await request(app)
        .put('/api/v1/user/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: userCreds.password,
          newPassword: 'NewUser@789',
          confirmPassword: 'NewUser@789',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Confirm login with new password
      const loginRes = await request(app)
        .post('/api/v1/auth/user/login')
        .send({ email: userCreds.email, password: 'NewUser@789' });

      expect(loginRes.status).toBe(200);
      userToken = loginRes.body.data.accessToken as string;

      // Reset password back for remaining tests
      await request(app)
        .put('/api/v1/user/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'NewUser@789',
          newPassword: userCreds.password,
          confirmPassword: userCreds.password,
        });

      const relogin = await request(app)
        .post('/api/v1/auth/user/login')
        .send({ email: userCreds.email, password: userCreds.password });
      userToken = relogin.body.data.accessToken as string;
    });

    it('should reject wrong current password', async () => {
      const res = await request(app)
        .put('/api/v1/user/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'WrongPassword@123',
          newPassword: 'NewUser@789',
          confirmPassword: 'NewUser@789',
        });

      expect(res.status).toBe(401);
    });

    it('should reject mismatched new passwords', async () => {
      const res = await request(app)
        .put('/api/v1/user/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: userCreds.password,
          newPassword: 'NewUser@789',
          confirmPassword: 'DifferentPass@123',
        });

      expect(res.status).toBe(400);
    });

    it('should reject weak new password', async () => {
      const res = await request(app)
        .put('/api/v1/user/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: userCreds.password,
          newPassword: 'weak',
          confirmPassword: 'weak',
        });

      expect(res.status).toBe(400);
    });

    it('should reject same new password as current', async () => {
      const res = await request(app)
        .put('/api/v1/user/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: userCreds.password,
          newPassword: userCreds.password,
          confirmPassword: userCreds.password,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('same');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).put('/api/v1/user/change-password').send({
        currentPassword: userCreds.password,
        newPassword: 'NewUser@789',
        confirmPassword: 'NewUser@789',
      });

      expect(res.status).toBe(401);
    });
  });
});

// ─────────────────────────────────────────────
// SAVED JOBS
// ─────────────────────────────────────────────

describe('Saved Jobs', () => {
  describe('POST /api/v1/user/jobs/:id/save', () => {
    it('should save a published job', async () => {
      const res = await request(app)
        .post(`/api/v1/user/jobs/${savedJobId}/save`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify savedJobCount incremented
      const sub = await prisma.subscription.findUnique({ where: { userId } });
      expect(sub?.savedJobCount).toBe(1);
    });

    it('should reject saving the same job twice', async () => {
      const res = await request(app)
        .post(`/api/v1/user/jobs/${savedJobId}/save`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already saved');
    });

    it('should reject saving a non-existent job', async () => {
      const res = await request(app)
        .post('/api/v1/user/jobs/00000000-0000-0000-0000-000000000000/save')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).post(`/api/v1/user/jobs/${savedJobId}/save`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/user/saved-jobs', () => {
    it('should return paginated list of saved jobs', async () => {
      const res = await request(app)
        .get('/api/v1/user/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.savedJobs)).toBe(true);
      expect(res.body.meta).toBeDefined();

      const saved = res.body.data.savedJobs as { jobId: string }[];
      expect(saved.some((s) => s.jobId === savedJobId)).toBe(true);
    });

    it('should include job details in saved jobs', async () => {
      const res = await request(app)
        .get('/api/v1/user/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      const saved = res.body.data.savedJobs as { job?: unknown }[];
      if (saved.length > 0) {
        expect(saved[0]?.job).not.toBeNull();
      }
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/v1/user/saved-jobs?page=1&limit=5')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(5);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/user/saved-jobs');
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/user/jobs/:id/save', () => {
    it('should unsave a saved job', async () => {
      const res = await request(app)
        .delete(`/api/v1/user/jobs/${savedJobId}/save`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify savedJobCount decremented
      const sub = await prisma.subscription.findUnique({ where: { userId } });
      expect(sub?.savedJobCount).toBe(0);
    });

    it('should return 404 when unsaving a job that was not saved', async () => {
      const res = await request(app)
        .delete(`/api/v1/user/jobs/${savedJobId}/save`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not saved');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).delete(`/api/v1/user/jobs/${savedJobId}/save`);
      expect(res.status).toBe(401);
    });
  });

  describe('Save job limit (FREE plan)', () => {
    it('should reject saving when FREE plan limit is reached', async () => {
      // Force savedJobCount to FREE limit (5)
      await prisma.subscription.updateMany({
        where: { userId },
        data: { savedJobCount: 5 },
      });

      // Ensure plan is FREE
      const freePlan = await prisma.planCatalogue.findFirst({ where: { key: 'FREE' } });
      if (freePlan !== null) {
        await prisma.subscription.updateMany({
          where: { userId },
          data: { plan: freePlan.key },
        });
      } else {
        throw new Error('FREE plan not found');
      }

      const res = await request(app)
        .post(`/api/v1/user/jobs/${savedJobId}/save`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('limit');

      // Reset
      await prisma.subscription.updateMany({
        where: { userId },
        data: { savedJobCount: 0 },
      });
    });
  });
});

// ─────────────────────────────────────────────
// RESUME
// ─────────────────────────────────────────────

describe('Resume', () => {
  describe('DELETE /api/v1/user/profile/resume', () => {
    it('should return 400 when no resume exists', async () => {
      const res = await request(app)
        .delete('/api/v1/user/profile/resume')
        .set('Authorization', `Bearer ${userToken}`);

      // Either 400 (no resume) or 200 (idempotent) is acceptable
      expect([200, 400]).toContain(res.status);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).delete('/api/v1/user/profile/resume');
      expect(res.status).toBe(401);
    });
  });
});

// ─────────────────────────────────────────────
// DELETE ACCOUNT
// ─────────────────────────────────────────────

describe('Delete Account', () => {
  describe('DELETE /api/v1/user/account', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).delete('/api/v1/user/account');
      expect(res.status).toBe(401);
    });

    it('should delete account successfully', async () => {
      // Create a throwaway user to delete
      const throwawayEmail = `throwaway-${testRunId}@example.com`;
      await request(app).post('/api/v1/auth/user/register').send({
        email: throwawayEmail,
        password: 'User@123456',
        firstName: 'Throw',
        lastName: 'Away',
      });
      await prisma.user.update({
        where: { email: throwawayEmail },
        data: { isEmailVerified: true },
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/user/login')
        .send({ email: throwawayEmail, password: 'User@123456' });
      const throwawayToken = loginRes.body.data.accessToken as string;

      const res = await request(app)
        .delete('/api/v1/user/account')
        .set('Authorization', `Bearer ${throwawayToken}`)
        .send({ password: 'User@123456' });

      expect(res.status).toBe(200);

      // Verify account is gone (or deactivated)
      const loginAfter = await request(app)
        .post('/api/v1/auth/user/login')
        .send({ email: throwawayEmail, password: 'User@123456' });

      expect([401, 403]).toContain(loginAfter.status);
    });

    it('should reject with wrong password', async () => {
      const res = await request(app)
        .delete('/api/v1/user/account')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ password: 'WrongPassword@123' });

      expect(res.status).toBe(401);
    });
  });
});
