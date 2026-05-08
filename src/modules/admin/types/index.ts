import {
  type JobStatus,
  type JobType,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from '@prisma/client';

// ─────────────────────────────────────────────
// JOBS RESPONSE TYPE
// ─────────────────────────────────────────────

export interface IAdminJobListItem {
  id: string;
  title: string;
  slug: string;
  jobType: JobType;
  status: JobStatus;
  location: string | null;
  isRemote: boolean;
  requiredPlan: SubscriptionPlan;
  views: number;
  publishedAt: Date | null;
  createdAt: Date;
  organization: {
    id: string;
    email: string;
    profile: { companyName: string } | null;
  };
  _count: { applications: number };
}

// ─────────────────────────────────────────────
// ORG RESPONSE TYPE
// ─────────────────────────────────────────────
export interface IAdminOrgListItem {
  id: string;
  email: string;
  isApproved: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  isPaymentMethodOnFile: boolean;
  hasUnpaidIncentives: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  profile: {
    companyName: string;
    industry: string | null;
    companySize: string | null;
    location: string | null;
    country: string | null;
  } | null;
  _count: {
    jobs: number;
  };
}

// ─────────────────────────────────────────────
// DASHBOARD STATS RESPONSE TYPE
// ─────────────────────────────────────────────

export interface IAdminDashboardStats {
  users: {
    total: number;
    active: number;
    newThisWeek: number;
  };
  organizations: {
    total: number;
    approved: number;
    pendingApproval: number;
    newThisWeek: number;
  };
  jobs: {
    total: number;
    published: number;
    draft: number;
    closed: number;
  };
  applications: {
    total: number;
    hired: number;
  };
  revenue: {
    mrrCents: number;
    activeBasic: number;
    activePremium: number;
  };
  incentives: {
    totalPendingCents: number;
    totalPendingCount: number;
    totalOverdueCount: number;
    totalCollectedCents: number;
  };
}

// ─────────────────────────────────────────────
// SUBSCRIPTION RESPONSE TYPE
// ─────────────────────────────────────────────

export interface IAdminSubscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  applyCountThisMonth: number;
  applyCountResetAt: Date | null;
  savedJobCount: number;
  updatedAt: Date | null;
  createdAt: Date | null;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    } | null;
  } | null;
}

// ─────────────────────────────────────────────
// USERS RESPONSE TYPE
// ─────────────────────────────────────────────

export interface IAdminUserListItem {
  id: string;
  email: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  profile: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  subscription: {
    plan: string;
  } | null;
}

export interface IAdminUserDetail extends IAdminUserListItem {
  role: string;
  twoFactorEnabled: boolean;
  updatedAt: Date;
  profile: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    resumeUrl: string | null;
    phone: string | null;
    headline: string | null;
    location: string | null;
    skills: string[];
    experienceYears: number;
  } | null;
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: Date | null;
  } | null;
  _count: {
    applications: number;
  };
}

export interface IAdminUserStatusResponse {
  id: string;
  email: string;
  isActive: boolean;
}
