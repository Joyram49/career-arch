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
  // Count of applications with status HIRED across all of this org's jobs
  hiredCount: number;
  // Currently-unpaid incentives (PENDING + OVERDUE + DISPUTED), aggregated
  incentives: {
    unpaidAmountCents: number;
    unpaidCount: number;
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
    userPrevWeek: number;
  };
  organizations: {
    total: number;
    approved: number;
    pendingApproval: number;
    newThisWeek: number;
    orgsPrevWeek: number;
  };
  jobs: {
    total: number;
    published: number;
    draft: number;
    closed: number;
    newJobThisMonth: number;
    newJobPrevMonth: number;
  };
  applications: {
    total: number;
    hired: number;
  };
  revenue: {
    mrrCents: number;
    previousMrrCents: number;
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
export type ChartRange = '30d' | '2m' | '3m' | '6m' | '1y' | '2y' | '3y' | '5y';

export interface IRegistrationBucket {
  label: string; // e.g. "5 May" or "May 2025"
  startDate: string; // ISO
  endDate: string; // ISO
  users: number;
  orgs: number;
}

export interface IRegistrationChartData {
  range: ChartRange;
  buckets: IRegistrationBucket[]; // always length 10
}

export type RevenueTrendRange = '7w' | ChartRange;

// ── Revenue Trend (Bar) ──────────────────────
export interface IRevenueTrendBucket {
  label: string;
  startDate: string;
  endDate: string;
  subscriptionRevenueCents: number;
  incentiveRevenueCents: number;
  totalRevenueCents: number;
}

export interface IRevenueTrendData {
  range: RevenueTrendRange;
  buckets: IRevenueTrendBucket[]; // always length 7
}

// ── Revenue by Plan (Donut) ───────────────────
export type PlanKey = 'FREE' | 'BASIC' | 'PREMIUM';

export interface IRevenueByPlanItem {
  plan: PlanKey;
  amountCents: number;
}

export interface IRevenueByPlanData {
  range: ChartRange;
  totalCents: number;
  breakdown: IRevenueByPlanItem[]; // always 3 items: FREE, BASIC, PREMIUM
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
  _count: {
    applications: number;
  };
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
    plan: SubscriptionPlan;
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
