import { sendCreated, sendSuccess } from '@utils/apiResponse';
import {
  ACCESS_COOKIE_OPTIONS,
  COOKIE_NAMES,
  REFRESH_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS_REMEMBER_ME,
} from '@utils/constants';

import * as UserAuthService from '@/services/auth/user.auth.service';

import type { IAuthenticatedRequest } from '@app-types/index';
import type { Request, Response } from 'express';

// ── Register ───────────────────────────────────────────────────────────────
export async function register(req: Request, res: Response): Promise<Response> {
  const result = await UserAuthService.registerUser(
    req.body as {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    },
  );
  return sendCreated(res, null, result.message);
}

// ── Verify Email ───────────────────────────────────────────────────────────
export async function verifyEmail(req: Request, res: Response): Promise<Response> {
  const { token } = req.query as { token: string };
  const result = await UserAuthService.verifyEmail(token);
  return sendSuccess(res, null, result.message);
}

// ── Resend Verification ────────────────────────────────────────────────────
export async function resendVerification(req: Request, res: Response): Promise<Response> {
  const { email } = req.body as { email: string };
  const result = await UserAuthService.resendVerificationEmail(email);
  return sendSuccess(res, null, result.message);
}

// ── Login ──────────────────────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<Response> {
  const body = req.body as { email: string; password: string; rememberMe: boolean };
  const result = await UserAuthService.loginUser(body);

  // 2FA required — return temp token, no cookies yet
  if (result.requires2FA === true) {
    return sendSuccess(res, { requires2FA: true, tempToken: result.tempToken }, 'OTP required');
  }

  // Set cookies
  if (result.tokens !== undefined) {
    res.cookie(COOKIE_NAMES.ACCESS_TOKEN, result.tokens.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      result.tokens.refreshToken,
      body.rememberMe ? REFRESH_COOKIE_OPTIONS_REMEMBER_ME : REFRESH_COOKIE_OPTIONS,
    );
  }

  return sendSuccess(
    res,
    {
      user: result.user,
      accessToken: result.tokens?.accessToken,
    },
    'Login successful',
  );
}

// ── Validate 2FA ───────────────────────────────────────────────────────────
export async function validateTwoFa(req: Request, res: Response): Promise<Response> {
  const body = req.body as { tempToken: string; otp: string };
  const result = await UserAuthService.validateTwoFa(body);

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, result.tokens.accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

  return sendSuccess(
    res,
    {
      user: result.user,
      accessToken: result.tokens.accessToken,
    },
    'Login successful',
  );
}

// ── Logout ─────────────────────────────────────────────────────────────────
export async function logout(req: Request, res: Response): Promise<Response> {
  const accessToken =
    req.headers['authorization']?.slice(7) ??
    (req.cookies[COOKIE_NAMES.ACCESS_TOKEN] as string | undefined) ??
    '';

  const refreshTokenCookie = (req.cookies[COOKIE_NAMES.REFRESH_TOKEN] as string | undefined) ?? '';

  await UserAuthService.logoutUser(accessToken, refreshTokenCookie);

  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { path: '/' });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: '/' });

  return sendSuccess(res, null, 'Logged out successfully');
}

// ── Refresh Token ──────────────────────────────────────────────────────────
export async function refreshToken(req: Request, res: Response): Promise<Response> {
  const rawRefreshToken = (req.cookies[COOKIE_NAMES.REFRESH_TOKEN] as string | undefined) ?? '';

  const tokens = await UserAuthService.refreshUserToken(rawRefreshToken);

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

  return sendSuccess(res, { accessToken: tokens.accessToken }, 'Token refreshed');
}

// ── Forgot Password ────────────────────────────────────────────────────────
export async function forgotPassword(req: Request, res: Response): Promise<Response> {
  const { email } = req.body as { email: string };
  const result = await UserAuthService.forgotPassword(email);
  return sendSuccess(res, null, result.message);
}

// ── Reset Password ─────────────────────────────────────────────────────────
export async function resetPassword(req: Request, res: Response): Promise<Response> {
  const body = req.body as { token: string; newPassword: string; confirmPassword: string };
  const result = await UserAuthService.resetPassword(body);
  return sendSuccess(res, null, result.message);
}

// ── Setup 2FA ──────────────────────────────────────────────────────────────
export async function setupTwoFa(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const result = await UserAuthService.setupTwoFa(sub);
  return sendSuccess(
    res,
    result,
    '2FA setup initiated. Scan the QR code with your authenticator app.',
  );
}

// ── Verify & Enable 2FA ───────────────────────────────────────────────────
export async function verifyTwoFa(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const { otp } = req.body as { otp: string };
  const result = await UserAuthService.verifyAndEnableTwoFa(sub, otp);
  return sendSuccess(res, { backupCodes: result.backupCodes }, result.message);
}

// ── Disable 2FA ────────────────────────────────────────────────────────────
export async function disableTwoFa(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const { password, otp } = req.body as { password: string; otp: string };
  const result = await UserAuthService.disableTwoFa(sub, password, otp);
  return sendSuccess(res, null, result.message);
}

// ── Get Me ─────────────────────────────────────────────────────────────────
export async function getMe(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const user = await UserAuthService.getUserMe(sub);
  return sendSuccess(res, { user }, 'User profile retrieved');
}
