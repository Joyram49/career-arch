import type { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

// ── Plan feature flags (matches seed PLAN_FEATURES shape) ─────────────────
export interface IPlanFeatures {
  jobBrowseLimit: number; // -1 = unlimited
  applyMonthlyLimit: number; // -1 = unlimited
  saveJobsLimit: number; // -1 = unlimited
  canViewOrgProfile: boolean;
  resumeVersions: number; // -1 = unlimited
  canDownloadHistory: boolean;
  earlyJobAlerts: boolean;
  prioritySearch: boolean;
  aiResumeTips: boolean;
  badge: 'basic' | 'premium' | null;
}

// ── Plan catalogue (what admin manages) ───────────────────────────────────
export interface IPlanCatalogueResponse {
  id: string;
  key: SubscriptionPlan;
  displayName: string;
  description: string | null;
  monthlyPriceCents: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
  isActive: boolean;
  sortOrder: number;
  features: IPlanFeatures;
  createdAt: Date;
  updatedAt: Date;
}

// ── User subscription response ────────────────────────────────────────────
export interface ISubscriptionUsage {
  applyCountThisMonth: number;
  applyMonthlyLimit: number;
  savedJobCount: number;
  saveJobsLimit: number;
}

export interface IMySubscriptionResponse {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  usage: ISubscriptionUsage;
  planDetails: Pick<
    IPlanCatalogueResponse,
    'key' | 'displayName' | 'monthlyPriceCents' | 'features'
  >;
}

// ── Stripe invoice (returned from Stripe API, shaped for our response) ────
export interface IInvoiceResponse {
  id: string;
  amountPaid: number;
  currency: string;
  status: string | null;
  periodStart: Date;
  periodEnd: Date;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  createdAt: Date;
}

// ── Admin subscription stats ──────────────────────────────────────────────
export interface ISubscriptionStats {
  totalActive: number;
  byPlan: {
    FREE: number;
    BASIC: number;
    PREMIUM: number;
  };
  mrrCents: number; // monthly recurring revenue in cents
  pastDue: number;
  cancellingAtPeriodEnd: number;
}
