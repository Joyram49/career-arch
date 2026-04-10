import { jest } from '@jest/globals';

// ── Mock the entire email service ──────────────────────────────────────────
// Prevents real emails from being sent during tests.
// Every email function becomes a no-op spy you can assert on.
jest.mock('@services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendOrgVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
  sendTwoFaEnabledEmail: jest.fn().mockResolvedValue(undefined),
  sendApplicationConfirmationUser: jest.fn().mockResolvedValue(undefined),
  sendApplicationReceivedOrg: jest.fn().mockResolvedValue(undefined),
}));

// ── Silence console output during tests ────────────────────────────────────
// Keeps test output clean. console.error stays visible so failures still show.
jest.spyOn(console, 'log').mockImplementation(() => undefined);
jest.spyOn(console, 'info').mockImplementation(() => undefined);
