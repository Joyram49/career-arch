import * as AdminAuthService from '@services/admin.auth.service';
import { sendSuccess } from '@utils/apiResponse';
import { ACCESS_COOKIE_OPTIONS, COOKIE_NAMES, REFRESH_COOKIE_OPTIONS } from '@utils/constants';

import type { IAuthenticatedRequest } from '@app-types/index';
import type { Request, Response } from 'express';

// ── Login ──────────────────────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<Response> {
  const body = req.body as { email: string; password: string };
  const result = await AdminAuthService.loginAdmin(body);

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, result.tokens.accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

  return sendSuccess(
    res,
    {
      admin: result.admin,
      accessToken: result.tokens.accessToken,
    },
    'Admin login successful',
  );
}

// ── Logout ─────────────────────────────────────────────────────────────────
export async function logout(req: Request, res: Response): Promise<Response> {
  const accessToken =
    req.headers['authorization']?.slice(7) ??
    (req.cookies[COOKIE_NAMES.ACCESS_TOKEN] as string | undefined) ??
    '';

  const refreshTokenCookie = (req.cookies[COOKIE_NAMES.REFRESH_TOKEN] as string | undefined) ?? '';

  await AdminAuthService.logoutAdmin(accessToken, refreshTokenCookie);

  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { path: '/' });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: '/' });

  return sendSuccess(res, null, 'Logged out successfully');
}

// ── Refresh Token ──────────────────────────────────────────────────────────
export async function refreshToken(req: Request, res: Response): Promise<Response> {
  const rawRefreshToken = (req.cookies[COOKIE_NAMES.REFRESH_TOKEN] as string | undefined) ?? '';

  const tokens = await AdminAuthService.refreshAdminToken(rawRefreshToken);

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

  return sendSuccess(res, { accessToken: tokens.accessToken }, 'Token refreshed');
}

// ── Get Me ─────────────────────────────────────────────────────────────────
export async function getMe(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const admin = await AdminAuthService.getAdminMe(sub);
  return sendSuccess(res, { admin }, 'Admin profile retrieved');
}
