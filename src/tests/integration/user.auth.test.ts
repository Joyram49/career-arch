import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import app from '@/app';

const prisma = new PrismaClient();

describe('User Auth API', () => {
  const testUser = {
    email: 'testuser@example.com',
    password: 'Test@123456',
    firstName: 'Test',
    lastName: 'User',
  };

  // Clean up test data after each test
  afterEach(async () => {
    await prisma.subscription.deleteMany({ where: { user: { email: testUser.email } } });
    await prisma.refreshToken.deleteMany({ where: { user: { email: testUser.email } } });
    await prisma.userProfile.deleteMany({ where: { user: { email: testUser.email } } });
    await prisma.user.deleteMany({ where: { email: testUser.email } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── Register ─────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/user/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app).post('/api/v1/auth/user/register').send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Registration successful');
    });

    it('should reject duplicate email', async () => {
      await request(app).post('/api/v1/auth/user/register').send(testUser);

      const res = await request(app).post('/api/v1/auth/user/register').send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/user/register')
        .send({ ...testUser, password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/user/register')
        .send({ ...testUser, email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/user/register')
        .send({ email: testUser.email });

      expect(res.status).toBe(400);
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  describe('POST /api/v1/auth/user/login', () => {
    beforeEach(async () => {
      // Register and verify user first
      await request(app).post('/api/v1/auth/user/register').send(testUser);

      // Manually verify email in DB for login tests
      await prisma.user.update({
        where: { email: testUser.email },
        data: {
          isEmailVerified: true,
          emailVerifyToken: null,
          emailVerifyExpiry: null,
        },
      });
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/user/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
      // Cookies should be set
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/user/login')
        .send({ email: testUser.email, password: 'WrongPass@123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject unverified email login', async () => {
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isEmailVerified: false },
      });

      const res = await request(app)
        .post('/api/v1/auth/user/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(403);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/user/login')
        .send({ email: 'nobody@example.com', password: testUser.password });

      expect(res.status).toBe(401);
    });
  });

  // ── Get Me ────────────────────────────────────────────────────────────────
  describe('GET /api/v1/auth/user/me', () => {
    it('should return user profile when authenticated', async () => {
      // Register + verify + login
      await request(app).post('/api/v1/auth/user/register').send(testUser);
      await prisma.user.update({
        where: { email: testUser.email },
        data: { isEmailVerified: true },
      });
      const loginRes = await request(app)
        .post('/api/v1/auth/user/login')
        .send({ email: testUser.email, password: testUser.password });

      const { accessToken } = loginRes.body.data as { accessToken: string };

      const res = await request(app)
        .get('/api/v1/auth/user/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/user/me');
      expect(res.status).toBe(401);
    });
  });

  // ── Health Check ──────────────────────────────────────────────────────────
  describe('GET /api/v1/health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
