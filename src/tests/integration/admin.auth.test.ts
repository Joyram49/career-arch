import { prisma } from '@config/database';
import request from 'supertest';

import app from '@/app';

// ─────────────────────────────────────────────
// ADMIN AUTH INTEGRATION TESTS
// ─────────────────────────────────────────────

describe('Admin Auth API', () => {
  const testRunId = Date.now();

  const adminUser = {
    email: `admin-auth-test-${testRunId}@careerarch.com`,
    password: 'Admin@123456',
    name: 'Test Admin',
  };

  let adminToken: string;

  beforeAll(async () => {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash(adminUser.password, 4);
    await prisma.admin.upsert({
      where: { email: adminUser.email },
      update: {},
      create: {
        email: adminUser.email,
        password: hash,
        name: adminUser.name,
        role: 'ADMIN',
      },
    });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: { AND: [{ userId: null }, { orgId: null }] },
    });
    await prisma.admin.deleteMany({ where: { email: adminUser.email } });
    await prisma.$disconnect();
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/admin/login', () => {
    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: adminUser.email, password: adminUser.password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.admin).toBeDefined();
      expect(res.body.data.admin.email).toBe(adminUser.email);
      expect(res.body.data.admin.role).toBe('ADMIN');
      expect(res.body.data.admin.name).toBe(adminUser.name);
      expect(res.headers['set-cookie']).toBeDefined();

      adminToken = res.body.data.accessToken as string;
    });

    it('should not expose password hash in response', async () => {
      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: adminUser.email, password: adminUser.password });

      expect(res.body.data.admin.password).toBeUndefined();
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: adminUser.email, password: 'WrongPass@123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent admin', async () => {
      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: 'nobody@example.com', password: adminUser.password });

      expect(res.status).toBe(401);
    });

    it('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: adminUser.email });

      expect(res.status).toBe(400);
    });

    it('should reject missing email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ password: adminUser.password });

      expect(res.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: 'not-an-email', password: adminUser.password });

      expect(res.status).toBe(400);
    });

    it('should create refresh token in DB on login', async () => {
      const before = await prisma.refreshToken.count({
        where: { AND: [{ userId: null }, { orgId: null }] },
      });

      await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: adminUser.email, password: adminUser.password });

      const after = await prisma.refreshToken.count({
        where: { AND: [{ userId: null }, { orgId: null }] },
      });

      expect(after).toBeGreaterThan(before);
    });
  });

  // ── Get Me ────────────────────────────────────────────────────────────────
  describe('GET /api/v1/auth/admin/me', () => {
    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: adminUser.email, password: adminUser.password });
      adminToken = res.body.data.accessToken as string;
    });

    it('should return admin profile when authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/auth/admin/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.admin.email).toBe(adminUser.email);
      expect(res.body.data.admin.role).toBe('ADMIN');
      expect(res.body.data.admin.name).toBe(adminUser.name);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/admin/me');
      expect(res.status).toBe(401);
    });

    it('should return 401 with malformed token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/admin/me')
        .set('Authorization', 'Bearer not.a.valid.jwt');

      expect(res.status).toBe(401);
    });

    it('should return 403 when accessed with user token', async () => {
      const userEmail = `user-admin-test-${testRunId}@example.com`;
      await request(app).post('/api/v1/auth/user/register').send({
        email: userEmail,
        password: 'Test@123456',
        firstName: 'Test',
        lastName: 'User',
      });
      await prisma.user.update({
        where: { email: userEmail },
        data: { isEmailVerified: true },
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/user/login')
        .send({ email: userEmail, password: 'Test@123456' });
      const userToken = loginRes.body.data.accessToken as string;

      const res = await request(app)
        .get('/api/v1/auth/admin/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);

      // cleanup
      await prisma.subscription.deleteMany({ where: { user: { email: userEmail } } });
      await prisma.refreshToken.deleteMany({ where: { user: { email: userEmail } } });
      await prisma.userProfile.deleteMany({ where: { user: { email: userEmail } } });
      await prisma.user.deleteMany({ where: { email: userEmail } });
    });

    it('should return 403 when accessed with org token', async () => {
      const orgEmail = `org-admin-test-${testRunId}@example.com`;
      await request(app).post('/api/v1/auth/org/register').send({
        email: orgEmail,
        password: 'Test@123456',
        companyName: 'Test Corp',
      });
      await prisma.organization.update({
        where: { email: orgEmail },
        data: { isEmailVerified: true },
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/org/login')
        .send({ email: orgEmail, password: 'Test@123456' });
      const orgToken = loginRes.body.data.accessToken as string;

      const res = await request(app)
        .get('/api/v1/auth/admin/me')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(403);

      // cleanup
      await prisma.refreshToken.deleteMany({ where: { organization: { email: orgEmail } } });
      await prisma.orgProfile.deleteMany({ where: { organization: { email: orgEmail } } });
      await prisma.organization.deleteMany({ where: { email: orgEmail } });
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/admin/logout', () => {
    it('should logout successfully', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: adminUser.email, password: adminUser.password });

      const token = loginRes.body.data.accessToken as string;

      const logoutRes = await request(app)
        .post('/api/v1/auth/admin/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);
    });

    it('should blacklist access token after logout', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: adminUser.email, password: adminUser.password });

      const token = loginRes.body.data.accessToken as string;

      await request(app).post('/api/v1/auth/admin/logout').set('Authorization', `Bearer ${token}`);

      // Reusing the same token should now fail
      const meRes = await request(app)
        .get('/api/v1/auth/admin/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(401);
    });

    it('should revoke refresh token on logout', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: adminUser.email, password: adminUser.password });

      const token = loginRes.body.data.accessToken as string;
      const cookies = loginRes.headers['set-cookie'] as unknown as string[];

      await request(app)
        .post('/api/v1/auth/admin/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', cookies);

      // Refresh token should be revoked
      const refreshRes = await request(app)
        .post('/api/v1/auth/admin/refresh-token')
        .set('Cookie', cookies);

      expect(refreshRes.status).toBe(401);
    });
  });

  // ── Refresh Token ─────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/admin/refresh-token', () => {
    it('should reject missing refresh token cookie', async () => {
      const res = await request(app).post('/api/v1/auth/admin/refresh-token');
      expect(res.status).toBe(401);
    });

    it('should issue new access token with valid refresh token cookie', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: adminUser.email, password: adminUser.password });

      const cookies = loginRes.headers['set-cookie'] as unknown as string[];

      const refreshRes = await request(app)
        .post('/api/v1/auth/admin/refresh-token')
        .set('Cookie', cookies);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.accessToken).toBeDefined();
      // New token should be different from old one
      expect(refreshRes.body.data.accessToken).not.toBe(loginRes.body.data.accessToken);
    });

    it('should rotate refresh token (old cookie rejected after refresh)', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({ email: adminUser.email, password: adminUser.password });

      const oldCookies = loginRes.headers['set-cookie'] as unknown as string[];

      // Use refresh token once
      await request(app).post('/api/v1/auth/admin/refresh-token').set('Cookie', oldCookies);

      // Using old cookies again should fail (token rotated)
      const secondRefresh = await request(app)
        .post('/api/v1/auth/admin/refresh-token')
        .set('Cookie', oldCookies);

      expect(secondRefresh.status).toBe(401);
    });
  });
});
