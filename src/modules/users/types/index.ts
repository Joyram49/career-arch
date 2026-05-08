import { type Role, type SubscriptionPlan, type SubscriptionStatus } from '@prisma/client';

export interface IUserProfileResponse {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
    resumeUrl: string | null;
    headline: string | null;
    summary: string | null;
    location: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    portfolioUrl: string | null;
    skills: string[];
    experienceYears: number;
  } | null;
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: Date | null;
  } | null;
}

export interface IUserWithRelations {
  id: string;
  email: string;
  role: Role;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
    resumeUrl: string | null;
    headline: string | null;
    summary: string | null;
    location: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    portfolioUrl: string | null;
    skills: string[];
    experienceYears: number;
  } | null;
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
  } | null;
}
