import { type IncentiveStatus } from '@prisma/client';

export interface IIncentiveResponse {
  id: string;
  orgId: string;
  jobId: string;
  applicationId: string;
  amount: number;
  currency: string;
  status: IncentiveStatus;
  dueAt: Date | null;
  paidAt: Date | null;
  hiredAt: Date | null;
  stripePaymentIntentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  organization: {
    id: string;
    companyName: string;
  } | null;
  candidate: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  job: {
    title: string;
    slug: string;
  } | null;
}
export interface IIncentiveStats {
  totalCollectedCents: number;
  totalPending: number;
  pendingValueCents: number;
  totalOverdue: number;
  overdueValueCents: number;
  totalDisputed: number;
  totalWaived: number;
  totalPaid: number;
}
