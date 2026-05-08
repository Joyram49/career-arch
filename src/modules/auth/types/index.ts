import { type Role } from '@prisma/client';

import { type IOrgAuthResponse, type ITokenPair } from '@/types';

export interface IOrgLoginResult {
  requires2FA?: boolean;
  tempToken?: string;
  tokens?: ITokenPair;
  organization?: IOrgAuthResponse;
}

export type OrgWithProfile = {
  id: string;
  email: string;
  role: Role;
  isEmailVerified: boolean;
  isApproved: boolean;
  twoFactorEnabled: boolean;
  profile: { companyName: string; logoUrl: string | null } | null;
};
