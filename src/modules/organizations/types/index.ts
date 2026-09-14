import type { JobStatus, SubscriptionPlan } from '@prisma/client';

export interface IOrgProfileResponse {
  id: string;
  orgId: string;
  companyName: string;
  logoUrl: string | null;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  foundedYear: number | null;
  description: string | null;
  location: string | null;
  country: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  email: string;
  isApproved: boolean;
  isPaymentMethodOnFile: boolean;
  hasUnpaidIncentives: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBillingInfo {
  isPaymentMethodOnFile: boolean;
  hasUnpaidIncentives: boolean;
  card: {
    brand: string;
    last4: string;
    expMonth: string;
    expYear: string;
  } | null;
}

export interface ISetupIntentResponse {
  clientSecret: string;
  customerId: string;
}

// ─────────────────────────────────────────────
// ORG DASHBOARD (org.stats.*)
// ─────────────────────────────────────────────

export interface IOrgDashboardStats {
  activeJobListings: number;
  jobsExpiringSoon: number;
  totalApplications: number;
  newApplicationsThisWeek: number;
  interviewsScheduled: number;
  interviewsThisWeek: number;
  successfulHires: number;
  pendingIncentiveAmount: number;
  pendingIncentiveCount: number;
}

export interface IOrgJobPerformanceItem {
  id: string;
  title: string;
  slug: string;
  status: JobStatus;
  requiredPlan: SubscriptionPlan;
  applicationsCount: number;
  views: number;
  daysActive: number;
  deadline: string | null;
}

export interface IOrgRecentApplicant {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateAvatarUrl: string | null;
  jobId: string;
  jobTitle: string;
  appliedAt: string;
}
