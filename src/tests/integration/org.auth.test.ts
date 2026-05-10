import { prisma } from '@config/database';
import request from 'supertest';

import app from '@/app';

// ─────────────────────────────────────────────
// ORG AUTH INTEGRATION TESTS
// ─────────────────────────────────────────────

describe('Org Auth API', () => {
  const testRunId = Date.now();

  const testOrg = {
    email: `testOrg-${testRunId}@example.com`,
    password: 'Test@123456',
    companyName: 'TestCorp Inc.',
  };

  let createdOrgEmails: string[] = [testOrg.email];

  async function cleanupOrgs(emails: string[]): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { organization: { email: { in: emails } } },
    });
    await prisma.orgProfile.deleteMany({
      where: { organization: { email: { in: emails } } },
    });
    await prisma.organization.deleteMany({ where: { email: { in: emails } } });
  }

  afterEach(async () => {
    await cleanupOrgs(createdOrgEmails);
    createdOrgEmails = [testOrg.email];
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── Register ──────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/org/register', () => {
    it('should register a new organization successfully', async () => {
      const res = await request(app).post('/api/v1/auth/org/register').send(testOrg);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('registered');
    });

    it('should create org profile with companyName', async () => {
      await request(app).post('/api/v1/auth/org/register').send(testOrg);

      const org = await prisma.organization.findUnique({
        where: { email: testOrg.email },
        include: { profile: true },
      });
      expect(org?.profile?.companyName).toBe(testOrg.companyName);
      expect(org?.isEmailVerified).toBe(false);
      expect(org?.isApproved).toBe(false);
    });

    it('should reject duplicate email', async () => {
      await request(app).post('/api/v1/auth/org/register').send(testOrg);
      const res = await request(app).post('/api/v1/auth/org/register').send(testOrg);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const uniqueEmail = `weak-${testRunId}@example.com`;
      createdOrgEmails.push(uniqueEmail);

      const res = await request(app)
        .post('/api/v1/auth/org/register')
        .send({ ...testOrg, email: uniqueEmail, password: 'no_uppercase1!' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject missing companyName', async () => {
      const res = await request(app)
        .post('/api/v1/auth/org/register')
        .send({ email: testOrg.email, password: testOrg.password });

      expect(res.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/org/register')
        .send({ ...testOrg, email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('should reject password shorter than 8 chars', async () => {
      const res = await request(app)
        .post('/api/v1/auth/org/register')
        .send({ ...testOrg, password: 'Ab1!' });

      expect(res.status).toBe(400);
    });
  });

  // ── Verify Email ──────────────────────────────────────────────────────────
  describe('GET /api/v1/auth/org/verify-email', () => {
    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/org/verify-email')
        .query({ token: 'invalidToken123' });

      expect(res.status).toBe(400);
    });

    it('should reject missing token', async () => {
      const res = await request(app).get('/api/v1/auth/org/verify-email');
      expect(res.status).toBe(400);
    });

    it('should verify email with valid token', async () => {
      const uniqueEmail = `verify-org-${testRunId}@example.com`;
      createdOrgEmails.push(uniqueEmail);

      await request(app)
        .post('/api/v1/auth/org/register')
        .send({ ...testOrg, email: uniqueEmail });

      const rawToken = 'rawVerifyToken123abc456def789';
      const crypto = await import('crypto');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.organization.update({
        where: { email: uniqueEmail },
        data: {
          emailVerifyToken: hashedToken,
          emailVerifyExpiry: new Date(Date.now() + 3_600_000),
        },
      });

      const res = await request(app)
        .get('/api/v1/auth/org/verify-email')
        .query({ token: rawToken });

      expect(res.status).toBe(200);

      const updatedOrg = await prisma.organization.findUnique({ where: { email: uniqueEmail } });
      expect(updatedOrg?.isEmailVerified).toBe(true);
      expect(updatedOrg?.emailVerifyToken).toBeNull();
    });

    it('should reject expired token', async () => {
      const uniqueEmail = `expired-org-${testRunId}@example.com`;
      createdOrgEmails.push(uniqueEmail);

      await request(app)
        .post('/api/v1/auth/org/register')
        .send({ ...testOrg, email: uniqueEmail });

      const rawToken = 'expiredToken123';
      const crypto = await import('crypto');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.organization.update({
        where: { email: uniqueEmail },
        data: {
          emailVerifyToken: hashedToken,
          emailVerifyExpiry: new Date(Date.now() - 1_000),
        },
      });

      const res = await request(app)
        .get('/api/v1/auth/org/verify-email')
        .query({ token: rawToken });

      expect(res.status).toBe(400);
    });

    it('should return success if already verified', async () => {
      const uniqueEmail = `alreadyVerified-${testRunId}@example.com`;
      createdOrgEmails.push(uniqueEmail);

      await request(app)
        .post('/api/v1/auth/org/register')
        .send({ ...testOrg, email: uniqueEmail });

      const rawToken = 'alreadyVerifiedToken';
      const crypto = await import('crypto');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.organization.update({
        where: { email: uniqueEmail },
        data: {
          isEmailVerified: true,
          emailVerifyToken: hashedToken,
          emailVerifyExpiry: new Date(Date.now() + 3_600_000),
        },
      });

      const res = await request(app)
        .get('/api/v1/auth/org/verify-email')
        .query({ token: rawToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('already verified');
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/org/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/org/register').send(testOrg);
      await prisma.organization.update({
        where: { email: testOrg.email },
        data: { isEmailVerified: true },
      });
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/org/login')
        .send({ email: testOrg.email, password: testOrg.password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.organization).toBeDefined();
      expect(res.body.data.organization.email).toBe(testOrg.email);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should not expose password hash in response', async () => {
      const res = await request(app)
        .post('/api/v1/auth/org/login')
        .send({ email: testOrg.email, password: testOrg.password });

      expect(res.body.data.organization.password).toBeUndefined();
    });

    it('should update lastLoginAt on successful login', async () => {
      await request(app)
        .post('/api/v1/auth/org/login')
        .send({ email: testOrg.email, password: testOrg.password });

      const org = await prisma.organization.findUnique({ where: { email: testOrg.email } });
      expect(org?.lastLoginAt).not.toBeNull();
    });

    it('should reject wrong password with generic message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/org/login')
        .send({ email: testOrg.email, password: 'WrongPass@123' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject unverified email login', async () => {
      await prisma.organization.update({
        where: { email: testOrg.email },
        data: { isEmailVerified: false },
      });

      const res = await request(app)
        .post('/api/v1/auth/org/login')
        .send({ email: testOrg.email, password: testOrg.password });

      expect(res.status).toBe(403);
    });

    it('should reject suspended org', async () => {
      await prisma.organization.update({
        where: { email: testOrg.email },
        data: { isActive: false },
      });

      const res = await request(app)
        .post('/api/v1/auth/org/login')
        .send({ email: testOrg.email, password: testOrg.password });

      expect(res.status).toBe(403);
    });

    it('should reject non-existent org', async () => {
      const res = await request(app)
        .post('/api/v1/auth/org/login')
        .send({ email: 'nobody@example.com', password: testOrg.password });

      expect(res.status).toBe(401);
    });

    it('should create refresh token in DB on login', async () => {
      const before = await prisma.refreshToken.count({
        where: { organization: { email: testOrg.email } },
      });

      await request(app)
        .post('/api/v1/auth/org/login')
        .send({ email: testOrg.email, password: testOrg.password });

      const after = await prisma.refreshToken.count({
        where: { organization: { email: testOrg.email } },
      });

      expect(after).toBe(before + 1);
    });
  });

  // ── Get Me ────────────────────────────────────────────────────────────────
  describe('GET /api/v1/auth/org/me', () => {
    it('should return org profile when authenticated', async () => {
      const uniqueOrg = { ...testOrg, email: `me-org-${testRunId}@example.com` };
      createdOrgEmails.push(uniqueOrg.email);

      await request(app).post('/api/v1/auth/org/register').send(uniqueOrg);
      await prisma.organization.update({
        where: { email: uniqueOrg.email },
        data: { isEmailVerified: true },
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/org/login')
        .send({ email: uniqueOrg.email, password: uniqueOrg.password });

      const { accessToken } = loginRes.body.data as { accessToken: string };

      const res = await request(app)
        .get('/api/v1/auth/org/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.organization.email).toBe(uniqueOrg.email);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/org/me');
      expect(res.status).toBe(401);
    });

    it('should return 401 with malformed token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/org/me')
        .set('Authorization', 'Bearer not.a.valid.jwt');

      expect(res.status).toBe(401);
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/org/logout', () => {
    it('should logout and revoke refresh token', async () => {
      await request(app).post('/api/v1/auth/org/register').send(testOrg);
      await prisma.organization.update({
        where: { email: testOrg.email },
        data: { isEmailVerified: true },
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/org/login')
        .send({ email: testOrg.email, password: testOrg.password });

      const { accessToken } = loginRes.body.data as { accessToken: string };

      const logoutRes = await request(app)
        .post('/api/v1/auth/org/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutRes.status).toBe(200);
    });

    it('should blacklist access token after logout', async () => {
      await request(app).post('/api/v1/auth/org/register').send(testOrg);
      await prisma.organization.update({
        where: { email: testOrg.email },
        data: { isEmailVerified: true },
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/org/login')
        .send({ email: testOrg.email, password: testOrg.password });

      const { accessToken } = loginRes.body.data as { accessToken: string };

      await request(app)
        .post('/api/v1/auth/org/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      const meRes = await request(app)
        .get('/api/v1/auth/org/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meRes.status).toBe(401);
    });
  });

  // ── Forgot Password ────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/org/forgot-password', () => {
    it('should return generic message for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/org/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should set passwordResetToken in DB for valid email', async () => {
      await request(app).post('/api/v1/auth/org/register').send(testOrg);

      await request(app).post('/api/v1/auth/org/forgot-password').send({ email: testOrg.email });

      const org = await prisma.organization.findUnique({ where: { email: testOrg.email } });
      expect(org?.passwordResetToken).not.toBeNull();
      expect(org?.passwordResetExpiry).not.toBeNull();
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/org/forgot-password')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
    });
  });

  // ── Reset Password ─────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/org/reset-password', () => {
    it('should reject invalid reset token', async () => {
      const res = await request(app).post('/api/v1/auth/org/reset-password').send({
        token: 'invalidToken',
        newPassword: 'NewPass@456',
        confirmPassword: 'NewPass@456',
      });

      expect(res.status).toBe(400);
    });

    it('should reject mismatched passwords', async () => {
      const res = await request(app).post('/api/v1/auth/org/reset-password').send({
        token: 'someToken',
        newPassword: 'NewPass@456',
        confirmPassword: 'DifferentPass@456',
      });

      expect(res.status).toBe(400);
    });

    it('should reset password with valid token and allow login with new password', async () => {
      await request(app).post('/api/v1/auth/org/register').send(testOrg);

      const rawToken = 'validResetToken123456789OrgAbc';
      const crypto = await import('crypto');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.organization.update({
        where: { email: testOrg.email },
        data: {
          isEmailVerified: true,
          passwordResetToken: hashedToken,
          passwordResetExpiry: new Date(Date.now() + 3_600_000),
        },
      });

      const res = await request(app).post('/api/v1/auth/org/reset-password').send({
        token: rawToken,
        newPassword: 'NewPass@456',
        confirmPassword: 'NewPass@456',
      });

      expect(res.status).toBe(200);

      const loginRes = await request(app)
        .post('/api/v1/auth/org/login')
        .send({ email: testOrg.email, password: 'NewPass@456' });

      expect(loginRes.status).toBe(200);
    });
  });

  // ── Refresh Token ─────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/org/refresh-token', () => {
    it('should reject missing refresh token cookie', async () => {
      const res = await request(app).post('/api/v1/auth/org/refresh-token');
      expect(res.status).toBe(401);
    });

    it('should issue new access token with valid refresh token cookie', async () => {
      await request(app).post('/api/v1/auth/org/register').send(testOrg);
      await prisma.organization.update({
        where: { email: testOrg.email },
        data: { isEmailVerified: true },
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/org/login')
        .send({ email: testOrg.email, password: testOrg.password });

      const cookies = loginRes.headers['set-cookie'] as unknown as string[];

      const refreshRes = await request(app)
        .post('/api/v1/auth/org/refresh-token')
        .set('Cookie', cookies);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.accessToken).toBeDefined();
    });
  });
});
