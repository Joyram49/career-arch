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

// ── Silence console output during tests ────────────────────────────────────
// Keeps test output clean. console.error stays visible so failures still show.
jest.spyOn(console, 'log').mockImplementation(() => undefined);
jest.spyOn(console, 'info').mockImplementation(() => undefined);
