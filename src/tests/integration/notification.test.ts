import { prisma } from '@config/database';
import request from 'supertest';

import app from '@/app';

// ─────────────────────────────────────────────
// NOTIFICATIONS INTEGRATION TESTS
// ─────────────────────────────────────────────

const testRunId = Date.now();

const userCreds = {
  email: `notif-user-${testRunId}@example.com`,
  password: 'User@123456',
  firstName: 'Notif',
  lastName: 'Tester',
};

const orgCreds = {
  email: `notif-org-${testRunId}@example.com`,
  password: 'Org@123456',
  companyName: 'Notif Test Corp',
};

let userToken: string;
let userId: string;
let orgToken: string;
let orgId: string;
let notificationId: string;
let orgNotificationId: string;

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

  const userLogin = await request(app)
    .post('/api/v1/auth/user/login')
    .send({ email: userCreds.email, password: userCreds.password });
  userToken = userLogin.body.data.accessToken as string;

  // Setup org
  await request(app).post('/api/v1/auth/org/register').send(orgCreds);
  const org = await prisma.organization.update({
    where: { email: orgCreds.email },
    data: {
      isEmailVerified: true,
      isApproved: true,
      stripeCustomerId: 'cus_notif_test',
      stripeDefaultPaymentMethodId: 'pm_notif_test',
      isPaymentMethodOnFile: true,
    },
  });
  orgId = org.id;
  await prisma.orgProfile.upsert({
    where: { orgId },
    update: {},
    create: { orgId, companyName: 'Notif Test Corp', industry: 'Technology' },
  });

  const orgLogin = await request(app)
    .post('/api/v1/auth/org/login')
    .send({ email: orgCreds.email, password: orgCreds.password });
  orgToken = orgLogin.body.data.accessToken as string;

  // Seed user notifications directly in DB
  const [n1, n2, n3] = await Promise.all([
    prisma.notification.create({
      data: {
        userId,
        recipientRole: 'USER',
        title: 'Application Updated',
        message: 'Your application status changed to REVIEWING.',
        link: 'http://demo-test-link.com',
      },
    }),
    prisma.notification.create({
      data: {
        userId,
        recipientRole: 'USER',
        title: 'Shortlisted!',
        message: 'You have been shortlisted.',
        link: 'http://demo-test-link.com',
      },
    }),
    prisma.notification.create({
      data: {
        userId,
        recipientRole: 'USER',
        title: 'Already Read',
        message: 'This one is already read.',
        link: 'http://demo-test-link.com',
      },
    }),
  ]);

  notificationId = n1.id;

  // Seed org notification
  const orgNotif = await prisma.notification.create({
    data: {
      orgId,
      recipientRole: 'ORGANIZATION',
      title: 'New Application Received',
      message: 'A new applicant applied to your job.',
      link: 'http://demo-test-link.com',
    },
  });
  orgNotificationId = orgNotif.id;

  // silence unused-var warnings
  void n2;
  void n3;
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { OR: [{ userId }, { orgId }] } });
  await prisma.subscription.deleteMany({ where: { userId } });
  await prisma.refreshToken.deleteMany({ where: { OR: [{ userId }, { orgId }] } });
  await prisma.userProfile.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.orgProfile.deleteMany({ where: { orgId } });
  await prisma.organization.deleteMany({ where: { id: orgId } });
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────
// USER NOTIFICATION TESTS
// ─────────────────────────────────────────────

describe('User Notifications', () => {
  // ── List ────────────────────────────────────────────────────────────────
  describe('GET /api/v1/notifications', () => {
    it('should return paginated list of own notifications', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.notifications)).toBe(true);
      expect(res.body.meta).toBeDefined();

      const notifs = res.body.data.notifications as { recipientRole?: string; id?: string }[];
      expect(notifs.every((n) => n.recipientRole === 'USER')).toBe(true);
      expect(notifs.every((n) => typeof n.id === 'string' && n.id.length > 0)).toBe(true);
    });

    it('should include unreadCount in response', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.unreadCount).toBeDefined();
      expect(typeof res.body.data.unreadCount).toBe('number');
      expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(2);
    });

    it('should filter by isRead=false', async () => {
      const res = await request(app)
        .get('/api/v1/notifications?isRead=false')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      const notifs = res.body.data.notifications as { isRead: boolean }[];
      expect(notifs.every((n) => n.isRead === false)).toBe(true);
    });

    it('should filter by isRead=true', async () => {
      const res = await request(app)
        .get('/api/v1/notifications?isRead=true')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      const notifs = res.body.data.notifications as { isRead: boolean }[];
      expect(notifs.every((n) => n.isRead === true)).toBe(true);
    });

    it('should support pagination (limit)', async () => {
      const res = await request(app)
        .get('/api/v1/notifications?page=1&limit=2')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(2);
      expect((res.body.data.notifications as unknown[]).length).toBeLessThanOrEqual(2);
    });

    it('should sort by newest first', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      const notifs = res.body.data.notifications as { createdAt: string }[];
      if (notifs.length >= 2) {
        const first = new Date(notifs[0]?.createdAt ?? '').getTime();
        const second = new Date(notifs[1]?.createdAt ?? '').getTime();
        expect(first).toBeGreaterThanOrEqual(second);
      }
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });

    it('should not return org notifications for user token', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      const notifs = res.body.data.notifications as { orgId?: string }[];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      expect(notifs.every((n) => n.orgId === null || n?.orgId === undefined)).toBe(true);
    });
  });

  // ── Mark Single as Read ────────────────────────────────────────────────
  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await prisma.notification.findUnique({ where: { id: notificationId } });
      expect(updated?.isRead).toBe(true);
    });

    it('should be idempotent (marking already-read notification)', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent notification', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/00000000-0000-0000-0000-000000000000/read')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });

    it('should not allow marking another users notification', async () => {
      // The org notification belongs to org, not this user
      const res = await request(app)
        .patch(`/api/v1/notifications/${orgNotificationId}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).patch(`/api/v1/notifications/${notificationId}/read`);
      expect(res.status).toBe(401);
    });
  });

  // ── Mark All as Read ───────────────────────────────────────────────────
  describe('PATCH /api/v1/notifications/read-all', () => {
    it('should mark all user notifications as read', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify all user notifications are now read
      const unread = await prisma.notification.count({
        where: { userId, isRead: false },
      });
      expect(unread).toBe(0);
    });

    it('should be idempotent (calling again when all already read)', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
    });

    it('should NOT mark org notifications as read', async () => {
      const orgNotifAfter = await prisma.notification.findUnique({
        where: { id: orgNotificationId },
      });
      expect(orgNotifAfter?.isRead).toBe(false);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).patch('/api/v1/notifications/read-all');
      expect(res.status).toBe(401);
    });
  });
});

// ─────────────────────────────────────────────
// ORG NOTIFICATION TESTS
// ─────────────────────────────────────────────

describe('Org Notifications', () => {
  describe('GET /api/v1/notifications (org token)', () => {
    it('should return org notifications only', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      const notifs = res.body.data.notifications as { recipientRole?: string; id?: string }[];
      expect(notifs.every((n) => n.recipientRole === 'ORGANIZATION')).toBe(true);
      expect(notifs.every((n) => typeof n.id === 'string' && n.id.length > 0)).toBe(true);
    });

    it('should include unreadCount for org', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.data.unreadCount).toBe('number');
      expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read (org token)', () => {
    it('should mark org notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${orgNotificationId}/read`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);

      const updated = await prisma.notification.findUnique({ where: { id: orgNotificationId } });
      expect(updated?.isRead).toBe(true);
    });

    it('should not allow org to mark user notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/notifications/read-all (org token)', () => {
    it('should mark all org notifications as read', async () => {
      // Seed a couple more unread org notifications
      await prisma.notification.createMany({
        data: [
          {
            orgId,
            recipientRole: 'ORGANIZATION',
            title: 'Incentive Due',
            message: 'You have a pending incentive.',
            isRead: false,
          },
          {
            orgId,
            recipientRole: 'ORGANIZATION',
            title: 'New Application 2',
            message: 'Another applicant applied.',
            isRead: false,
          },
        ],
      });

      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);

      const unread = await prisma.notification.count({
        where: { orgId, isRead: false },
      });
      expect(unread).toBe(0);
    });
  });
});
