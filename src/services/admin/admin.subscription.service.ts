import { type SubscriptionPlan, type SubscriptionStatus } from '@prisma/client';
import { BadRequestError, NotFoundError } from '@shared/utils/apiError';
import { buildPaginationMeta } from '@shared/utils/pagination';
import { extractPagination } from '@shared/utils/queryBuilder';

import { prisma } from '@/config/database';
import { stripe } from '@/config/stripe';
import { type AdminListSubscriptionsQuery } from '@/validations/subscription.validation';

import type Stripe from 'stripe';

// ─────────────────────────────────────────────
// ADMIN — LIST SUBSCRIPTIONS
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

export async function listSubscriptions(query: AdminListSubscriptionsQuery): Promise<{
  subscriptions: IAdminSubscription[];
  meta: ReturnType<typeof buildPaginationMeta>;
}> {
  const { limit, page, skip } = extractPagination(query);

  const where = {
    ...(query.plan !== undefined && { plan: query.plan }),
    ...(query.status !== undefined && {
      status: query.status,
    }),
  };

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.subscription.count({ where }),
  ]);

  return { subscriptions, meta: buildPaginationMeta(total, page, limit) };
}

// ─────────────────────────────────────────────
// ADMIN — SUBSCRIPTION STATS
// ─────────────────────────────────────────────

export async function getSubscriptionStats(): Promise<{
  totalActive: number;
  byPlan: { FREE: number; BASIC: number; PREMIUM: number };
  mrrCents: number;
  pastDue: number;
  cancellingAtPeriodEnd: number;
}> {
  const [byPlanRaw, pastDue, cancellingAtPeriodEnd, plans] = await Promise.all([
    prisma.subscription.groupBy({
      by: ['plan'],
      where: { status: 'ACTIVE' },
      _count: { plan: true },
    }),
    prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
    prisma.subscription.count({ where: { cancelAtPeriodEnd: true, status: 'ACTIVE' } }),
    prisma.planCatalogue.findMany({ select: { key: true, monthlyPriceCents: true } }),
  ]);

  const byPlan = { FREE: 0, BASIC: 0, PREMIUM: 0 };
  for (const row of byPlanRaw) {
    byPlan[row.plan] = row._count.plan;
  }

  const priceMap = Object.fromEntries(plans.map((p) => [p.key, p.monthlyPriceCents]));
  const mrrCents =
    byPlan.BASIC * (priceMap['BASIC'] ?? 0) + byPlan.PREMIUM * (priceMap['PREMIUM'] ?? 0);

  return {
    totalActive: byPlan.FREE + byPlan.BASIC + byPlan.PREMIUM,
    byPlan,
    mrrCents,
    pastDue,
    cancellingAtPeriodEnd,
  };
}

// ─────────────────────────────────────────────
// ADMIN — FORCE CANCEL
// ─────────────────────────────────────────────

export async function adminForceCancel(subscriptionId: string): Promise<{ message: string }> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { user: { select: { email: true, profile: { select: { firstName: true } } } } },
  });

  if (sub === null) throw new NotFoundError('Subscription not found');

  if (sub.plan === 'FREE') {
    throw new BadRequestError('Cannot cancel a FREE subscription');
  }

  // Cancel immediately on Stripe
  if (sub.stripeSubscriptionId !== null) {
    await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
  }

  // Downgrade to FREE in DB
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      plan: 'FREE',
      status: 'ACTIVE',
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    },
  });

  return { message: 'Subscription cancelled and user downgraded to FREE' };
}

// ─────────────────────────────────────────────
// ADMIN — REFUND LAST INVOICE
// ─────────────────────────────────────────────

export async function adminRefundLastInvoice(
  subscriptionId: string,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
): Promise<{ message: string; refundId: string }> {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (sub === null) throw new NotFoundError('Subscription not found');

  if (sub.stripeCustomerId === null) {
    throw new BadRequestError('No Stripe customer associated with this subscription');
  }

  // Get last paid invoice
  const invoices = await stripe.invoices.list({
    customer: sub.stripeCustomerId,
    limit: 1,
    status: 'paid',
    expand: ['data.payment_intent'],
  });

  const lastInvoice = invoices.data[0];
  if (lastInvoice === undefined) {
    throw new NotFoundError('No paid invoice found to refund');
  }

  const paymentIntentId = lastInvoice.payments?.data[0]?.payment.payment_intent;

  if (typeof paymentIntentId !== 'string') {
    throw new BadRequestError('Invalid payment intent for refund');
  }

  const params: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
    ...(reason !== undefined && { reason }),
    metadata: {
      type: 'REFUND',
      userId: sub.userId,
      customerId: sub.stripeCustomerId,
      subscriptionId: sub.stripeSubscriptionId,
      invoiceId: lastInvoice.id ?? '',
    },
  };

  const refund = await stripe.refunds.create(params);

  return { message: 'Refund issued successfully', refundId: refund.id };
}
