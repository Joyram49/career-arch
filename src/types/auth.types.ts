import type { Role, SubscriptionPlan } from '@prisma/client';
import type { Request } from 'express';
// ─────────────────────────────────────────────
// JWT & AUTH TYPES
// ─────────────────────────────────────────────

export interface IJwtPayload {
  sub: string;
  role: Role;
  email: string;
  plan?: SubscriptionPlan;
  jti: string; // JWT ID for blacklisting
  iat?: number;
  exp?: number;
}

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthenticatedRequest extends Request {
  user: IJwtPayload;
}

// ─────────────────────────────────────────────
// AUTH PAYLOAD TYPES (returned to client)
// ─────────────────────────────────────────────

export interface IUserAuthResponse {
  id: string;
  email: string;
  role: Role;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  profile: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  subscription: {
    plan: SubscriptionPlan;
    status: string;
  } | null;
}

export interface IOrgAuthResponse {
  id: string;
  email: string;
  role: Role;
  isEmailVerified: boolean;
  isApproved: boolean;
  twoFactorEnabled: boolean;
  profile: {
    companyName: string;
    logoUrl: string | null;
  } | null;
}

export interface IAdminAuthResponse {
  id: string;
  email: string;
  role: Role;
  name: string;
}

// ─────────────────────────────────────────────
// 2FA TYPES
// ─────────────────────────────────────────────

export interface ITwoFactorSetupResponse {
  qrCodeUrl: string;
  manualKey: string;
  backupCodes: string[];
}
