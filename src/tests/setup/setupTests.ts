import { RedisClient } from '@config/redis';
import { jest } from '@jest/globals';

// ── Mock the entire email service ──────────────────────────────────────────
// Prevents real emails from being sent during tests.
// Every email function becomes a no-op spy you can assert on.
jest.mock('@services/email.service', () => ({
  sendEmail: jest.fn(() => undefined),
  sendVerificationEmail: jest.fn(() => undefined),
  sendOrgVerificationEmail: jest.fn(() => undefined),
  sendPasswordResetEmail: jest.fn(() => undefined),
  sendPasswordChangedEmail: jest.fn(() => undefined),
  sendTwoFaEnabledEmail: jest.fn(() => undefined),
  sendApplicationConfirmationUser: jest.fn(() => undefined),
  sendApplicationReceivedOrg: jest.fn(() => undefined),
}));

// ── Mock Stripe for all tests ─────────────────────────────────────────────
// Prevents real Stripe API calls during tests.
jest.mock('@config/stripe', () => ({
  stripe: {
    products: {
      create: jest.fn().mockResolvedValue({ id: 'prod_test123' }),
      update: jest.fn().mockResolvedValue({}),
    },
    prices: {
      create: jest.fn().mockResolvedValue({ id: 'price_test123' }),
      update: jest.fn().mockResolvedValue({}),
    },
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test123',
          url: 'https://checkout.stripe.com/test',
        }),
      },
    },
    subscriptions: {
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        cancel_at_period_end: false,
        items: { data: [{ id: 'si_test123', price: { id: 'price_test123' } }] },
      }),
      update: jest.fn().mockResolvedValue({ id: 'sub_test123', cancel_at_period_end: true }),
      cancel: jest.fn().mockResolvedValue({}),
    },
    invoices: {
      list: jest.fn().mockResolvedValue({ data: [] }),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({ id: 're_test123' }),
    },
  },
}));

// ── Silence console output during tests ────────────────────────────────────
// Keeps test output clean. console.error stays visible so failures still show.
jest.spyOn(console, 'log').mockImplementation(() => undefined);
jest.spyOn(console, 'info').mockImplementation(() => undefined);

afterAll(async () => {
  await RedisClient.disconnect();
});
