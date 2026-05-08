import { type SubscriptionPlan } from '@prisma/client';

import { prisma } from '@/config/database';
import { getPlanFeatures } from '@/services/admin/admin.plan.service';
import { NotFoundError } from '@/shared/utils/apiError';

import { type IInvoiceResponse, type IPlanFeatures } from '../types';

import type Stripe from 'stripe';

export async function getActiveSubscriptionWithFeatures(userId: string): Promise<{
  sub: {
    plan: SubscriptionPlan;
    applyCountThisMonth: number;
    applyCountResetAt: Date;
    savedJobCount: number;
    id: string;
  };
  features: IPlanFeatures;
}> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      id: true,
      plan: true,
      applyCountThisMonth: true,
      applyCountResetAt: true,
      savedJobCount: true,
    },
  });

  if (sub === null) throw new NotFoundError('Subscription not found');

  const features = await getPlanFeatures(sub.plan);
  return { sub, features };
}

export function mapInvoiceToResponse(inv: Stripe.Invoice): IInvoiceResponse {
  return {
    id: inv.id ?? '',
    amountPaid: inv.amount_paid,
    currency: inv.currency,
    status: inv.status,
    periodStart: new Date(inv.period_start * 1000),
    periodEnd: new Date(inv.period_end * 1000),
    invoicePdf: inv.invoice_pdf ?? null,
    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    createdAt: new Date(inv.created * 1000),
  };
}
