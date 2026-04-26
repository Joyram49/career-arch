import * as UserService from '@services/profile/user.profile.service';
import { sendSuccess } from '@utils/apiResponse';
import { COOKIE_NAMES } from '@utils/constants';

import type { IAuthenticatedRequest } from '@app-types/index';
import type { Request, Response } from 'express';

// ── GET PROFILE ────────────────────────────────────────────────────────────

export async function getProfile(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const user = await UserService.getUserProfile(sub);
  return sendSuccess(res, { user }, 'Profile retrieved successfully');
}

// ── UPDATE PROFILE ─────────────────────────────────────────────────────────

export async function updateProfile(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const user = await UserService.updateUserProfile(
    sub,
    req.body as Parameters<typeof UserService.updateUserProfile>[1],
  );
  return sendSuccess(res, { user }, 'Profile updated successfully');
}

// ── UPLOAD AVATAR ──────────────────────────────────────────────────────────

export async function uploadAvatar(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;

  if (req.file === undefined) {
    // multer puts the file on req.file — if absent, no file was sent
    return sendSuccess(res, null, 'No file uploaded', 400);
  }

  const result = await UserService.updateUserAvatar(sub, req.file);
  return sendSuccess(res, result, 'Avatar uploaded successfully');
}

// ── UPLOAD RESUME ──────────────────────────────────────────────────────────

export async function uploadResume(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;

  if (req.file === undefined) {
    return sendSuccess(res, null, 'No file uploaded', 400);
  }

  const result = await UserService.updateUserResume(sub, req.file);
  return sendSuccess(res, result, 'Resume uploaded successfully');
}

// ── DELETE RESUME ──────────────────────────────────────────────────────────

export async function deleteResume(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const result = await UserService.deleteUserResume(sub);
  return sendSuccess(res, null, result.message);
}

// ── CHANGE PASSWORD ────────────────────────────────────────────────────────

export async function changePassword(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;

  const body = req.body as {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };

  const accessToken =
    req.headers['authorization']?.slice(7) ??
    (req.cookies[COOKIE_NAMES.ACCESS_TOKEN] as string | undefined) ??
    '';

  const refreshToken = (req.cookies[COOKIE_NAMES.REFRESH_TOKEN] as string | undefined) ?? '';

  const result = await UserService.changeUserPassword(
    sub,
    { currentPassword: body.currentPassword, newPassword: body.newPassword },
    accessToken,
    refreshToken,
  );

  // Clear auth cookies — user must log in again
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { path: '/' });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: '/' });

  return sendSuccess(res, null, result.message);
}

// ── DEACTIVATE ACCOUNT ─────────────────────────────────────────────────────

export async function deactivateAccount(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;

  const { password } = req.body as { password: string };

  const accessToken =
    req.headers['authorization']?.slice(7) ??
    (req.cookies[COOKIE_NAMES.ACCESS_TOKEN] as string | undefined) ??
    '';

  const result = await UserService.deactivateUserAccount(sub, password, accessToken);

  // Clear auth cookies
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { path: '/' });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: '/' });

  return sendSuccess(res, null, result.message);
}
