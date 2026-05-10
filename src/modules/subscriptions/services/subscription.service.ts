import { prisma } from '@config/database';
import { env } from '@config/env';
import { stripe } from '@config/stripe';
import { BadRequestError, NotFoundError } from '@shared/utils/apiError';
import { parseFeatures } from '@shared/utils/planFeaturesSchema';
import { format, startOfMonth } from 'date-fns';

import { logger } from '@/config/logger';
import { enqueueEmail } from '@/jobs/queues/email.queue';

import { mapInvoiceToResponse } from '../helpers';
import { type IInvoiceResponse, type IMySubscriptionResponse } from '../types';

import type { SubscriptionPlan } from '@prisma/client';
import type Stripe from 'stripe';

// ─────────────────────────────────────────────
// PUBLIC PLAN LIST (pricing page — active only)
// ─────────────────────────────────────────────

export async function getPublicPlans(): Promise<object[]> {
  const plans = await prisma.planCatalogue.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      key: true,
      displayName: true,
      description: true,
      monthlyPriceCents: true,
      features: true,
      sortOrder: true,
    },
  });
  return plans;
}

// ─────────────────────────────────────────────
// GET MY SUBSCRIPTION
// ─────────────────────────────────────────────

export async function getMySubscription(userId: string): Promise<IMySubscriptionResponse> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (sub === null) throw new NotFoundError('Subscription not found');

  const planDetails = await prisma.planCatalogue.findUnique({
    where: { key: sub.plan },
    select: { key: true, displayName: true, monthlyPriceCents: true, features: true },
  });

  if (planDetails === null) throw new NotFoundError('Plan details not found');

  const features = parseFeatures(planDetails.features);

  return {
    id: sub.id,
    plan: sub.plan,
    status: sub.status,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    usage: {
      applyCountThisMonth: sub.applyCountThisMonth,
      applyMonthlyLimit: features.applyMonthlyLimit,
      savedJobCount: sub.savedJobCount,
      saveJobsLimit: features.saveJobsLimit,
    },
    planDetails: {
      key: planDetails.key,
      displayName: planDetails.displayName,
      monthlyPriceCents: planDetails.monthlyPriceCents,
      features,
    },
  };
}

// ─────────────────────────────────────────────
// CREATE CHECKOUT SESSION (new subscription)
// ─────────────────────────────────────────────

export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  targetPlan: 'BASIC' | 'PREMIUM',
): Promise<{ checkoutUrl: string }> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (sub === null) throw new NotFoundError('Subscription record not found');

  // Guard: cannot subscribe to current active plan
  if (sub.plan === targetPlan && sub.status === 'ACTIVE' && !sub.cancelAtPeriodEnd) {
    throw new BadRequestError(`You are already on the ${targetPlan} plan`);
  }

  // Load plan catalogue
  const planCatalogue = await prisma.planCatalogue.findUnique({
    where: { key: targetPlan },
  });

  if (!planCatalogue) {
    throw new BadRequestError('Plan not found');
  }

  if (!planCatalogue.isActive) {
    throw new BadRequestError(`The ${targetPlan} plan is not available`);
  }

  if (planCatalogue.stripePriceId === null) {
    throw new BadRequestError(
      `The ${targetPlan} plan is not yet configured in Stripe. Please contact support.`,
    );
  }

  // ── If user already has an active paid Stripe subscription → upgrade/downgrade
  if (sub.stripeSubscriptionId !== null && sub.plan !== 'FREE') {
    return upgradePlan(sub.stripeSubscriptionId, planCatalogue.stripePriceId, targetPlan, sub.id);
  }

  // ── Ensure Stripe Customer exists ─────────────────────────────────────────
  let stripeCustomerId = sub.stripeCustomerId;

  if (stripeCustomerId === null) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { userId },
    });
    stripeCustomerId = customer.id;

    await prisma.subscription.update({
      where: { userId },
      data: { stripeCustomerId },
    });
  }

  // ── Create Stripe Checkout Session ────────────────────────────────────────
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: planCatalogue.stripePriceId, quantity: 1 }],
    success_url: `${env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_URL}/subscription/plans`,
    metadata: { userId, targetPlan, type: 'SUBSCRIPTION' },
    subscription_data: { metadata: { userId, targetPlan } },
  });

  if (session.url === null) {
    throw new BadRequestError('Failed to create checkout session');
  }

  return { checkoutUrl: session.url };
}

// ─────────────────────────────────────────────
// UPGRADE / DOWNGRADE (already on paid plan)
// ─────────────────────────────────────────────

async function upgradePlan(
  stripeSubscriptionId: string,
  newStripePriceId: string,
  targetPlan: SubscriptionPlan,
  subscriptionDbId: string,
): Promise<{ checkoutUrl: string }> {
  // Retrieve current subscription items from Stripe
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const currentItem = stripeSub.items.data[0];

  if (currentItem === undefined) {
    throw new BadRequestError('Could not retrieve current subscription item from Stripe');
  }

  // Update subscription — change takes effect next billing period
  await stripe.subscriptions.update(stripeSubscriptionId, {
    items: [{ id: currentItem.id, price: newStripePriceId }],
    proration_behavior: 'none',
  });

  // Optimistically update our DB (webhook will confirm + sync dates)
  await prisma.subscription.update({
    where: { id: subscriptionDbId },
    data: { plan: targetPlan },
  });

  return {
    checkoutUrl: `${env.FRONTEND_URL}/subscription/success?upgraded=true`,
  };
}

// ─────────────────────────────────────────────
// CANCEL SUBSCRIPTION
// ─────────────────────────────────────────────

export async function cancelSubscription(
  userId: string,
  userEmail: string,
  firstName: string,
): Promise<{ message: string; currentPeriodEnd: Date | null }> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (sub === null) throw new NotFoundError('Subscription not found');

  if (sub.plan === 'FREE') {
    throw new BadRequestError('You are on the Free plan — nothing to cancel');
  }

  if (sub.cancelAtPeriodEnd) {
    throw new BadRequestError('Your subscription is already scheduled for cancellation');
  }

  if (sub.stripeSubscriptionId === null) {
    throw new BadRequestError('No active Stripe subscription found');
  }

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await prisma.subscription.update({
    where: { userId },
    data: { cancelAtPeriodEnd: true },
  });

  enqueueEmail({
    name: 'subscription:cancelled',
    to: userEmail,
    firstName,
    accessUntil: sub.currentPeriodEnd?.toISOString() ?? null,
  });

  return {
    message: `Subscription cancelled. You have access until ${sub.currentPeriodEnd?.toDateString() ?? 'the end of your billing period'}.`,
    currentPeriodEnd: sub.currentPeriodEnd,
  };
}

// ─────────────────────────────────────────────
// REACTIVATE (undo cancel)
// ─────────────────────────────────────────────

export async function reactivateSubscription(userId: string): Promise<{ message: string }> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (sub === null) throw new NotFoundError('Subscription not found');

  if (!sub.cancelAtPeriodEnd) {
    throw new BadRequestError('Your subscription is not scheduled for cancellation');
  }

  if (sub.stripeSubscriptionId === null) {
    throw new BadRequestError('No active Stripe subscription found');
  }

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  await prisma.subscription.update({
    where: { userId },
    data: { cancelAtPeriodEnd: false },
  });

  return { message: 'Subscription reactivated. Your plan will continue as normal.' };
}

// ─────────────────────────────────────────────
// LIST INVOICES
// ─────────────────────────────────────────────

export async function listInvoices(userId: string): Promise<IInvoiceResponse[]> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (sub === null) {
    return [];
  }

  if (sub.stripeCustomerId === null) {
    return [];
  }

  const invoices = await stripe.invoices.list({
    customer: sub.stripeCustomerId,
    limit: 24, // last 2 years of monthly invoices
    status: 'paid',
  });

  return invoices.data.map((inv) => mapInvoiceToResponse(inv));
}

// ─────────────────────────────────────────────
// WEBHOOK HANDLERS
// Called by webhook.controller — not exposed via HTTP directly
// ─────────────────────────────────────────────

export async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata['userId'];
  const targetPlan = subscription.metadata['targetPlan'] as SubscriptionPlan | undefined;

  if (userId === undefined || targetPlan === undefined) {
    throw new BadRequestError('User ID is required');
  }

 const stripeSubId = subscription.id;

  await prisma.subscription.update({
    where: { userId },
    data: {
      plan: targetPlan,
      status: 'INACTIVE',
      stripeSubscriptionId: stripeSubId,
      stripeCustomerId:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id,
      cancelAtPeriodEnd: false,
    },
  });

  // Send activation email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: { select: { firstName: true } } },
  });

  if (user !== null) {
    enqueueEmail({
      name: 'subscription:activated',
      to: user.email,
      firstName: user.profile?.firstName ?? 'User',
      plan: targetPlan as 'BASIC' | 'PREMIUM',
    });
  }
}

export async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const invoiceId = typeof invoice.id === 'string' ? invoice.id : null;
  if (invoiceId === null) return;

  logger.info('invoice', { invoice });

  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id ?? null);

  if (customerId === null) return;

  const subscriptionId =
    typeof invoice.lines.data[0]?.subscription === 'string'
      ? invoice.lines.data[0].subscription
      : (invoice.lines.data[0]?.subscription?.id ?? null);

  if (subscriptionId === null) return;

  const periodStart = new Date(invoice.period_start * 1000);
  const periodEnd = new Date(invoice.period_end * 1000);
  const monthYear = format(periodStart, 'MMMM yyyy');

  // ─────────────────────────────
  // ✅ SUBSCRIPTION PAYMENT
  // ─────────────────────────────
  if (subscriptionId.length > 0) {
    const sub = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!sub) return;

    // Update subscription
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        applyCountThisMonth: 0,
        applyCountResetAt: startOfMonth(new Date()),
      },
    });

    // Insert payment (idempotency important)
    await prisma.payment.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        type: 'SUBSCRIPTION',
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'SUCCEEDED',
        stripeInvoiceId: invoiceId,
        description: `${sub.plan} Plan — ${monthYear}`,
      },
    });

    return;
  }

  // ─────────────────────────────
  // ✅ NON-SUBSCRIPTION PAYMENT
  // ─────────────────────────────
  await prisma.payment.create({
    data: {
      orgId: invoice.metadata?.['orgId'] ?? null,
      type: 'INCENTIVE',
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'SUCCEEDED',
      stripeInvoiceId: invoiceId,
      description: `Organization Incentive — ${monthYear}`,
    },
  });
}

export async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id ?? null);

  if (customerId === null) return;

  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: { status: 'PAST_DUE' },
  });

  // NOTE: Email is sent by webhook.controller after calling this function
  // so we intentionally do NOT enqueue here — the controller handles it
}

export async function handleSubscriptionDeleted(stripeSub: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;

  const sub = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { user: { include: { profile: { select: { firstName: true } } } } },
  });

  if (sub === null) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      plan: 'FREE',
      status: 'ACTIVE',
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
      currentPeriodStart: null,
      currentPeriodEnd: null,
    },
  });

  enqueueEmail({
    name: 'subscription:downgraded',
    to: sub.user.email,
    firstName: sub.user.profile?.firstName ?? 'User',
  });
}

export async function handleSubscriptionUpdated(stripeSub: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;

  await prisma.subscription.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      currentPeriodStart: new Date(
        stripeSub.items.data[0]?.current_period_start ?? new Date().getTime() * 1000,
      ),
      currentPeriodEnd: new Date(
        stripeSub.items.data[0]?.current_period_end ?? new Date().getTime() * 1000,
      ),
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    },
  });
}

export async function handleRefundCreated(refund: Stripe.Refund): Promise<void> {
  const userId = refund.metadata?.['userId'] ?? null;
  const subscriptionId = refund.metadata?.['subscriptionId'] ?? null;
  const invoiceId = refund.metadata?.['invoiceId'] ?? null;
  if (userId === null || subscriptionId === null || invoiceId === null) {
    return;
  }

  await prisma.payment.create({
    data: {
      userId,
      subscriptionId,
      type: 'REFUND',
      amount: refund.amount,
      currency: refund.currency,
      status: 'PENDING',
      stripeRefundId: refund.id,
      description: `Refund for invoice #${invoiceId} (${refund.reason ?? 'No reason provided'})`,
    },
  });
}

export async function handleRefundUpdated(refund: Stripe.Refund): Promise<void> {
  if (refund.status !== 'succeeded') {
    return;
  }
  const userId = refund.metadata?.['userId'] ?? null;
  const subscriptionId = refund.metadata?.['subscriptionId'] ?? null;
  const invoiceId = refund.metadata?.['invoiceId'] ?? null;
  if (userId === null || subscriptionId === null || invoiceId === null) {
    return;
  }

  await prisma.payment.update({
    where: { stripeRefundId: refund.id },
    data: { status: 'SUCCEEDED' },
  });

  //  later we could also email the user about the refund if we want
}

export async function handleRefundFailed(refund: Stripe.Refund): Promise<void> {
  const userId = refund.metadata?.['userId'] ?? null;
  const subscriptionId = refund.metadata?.['subscriptionId'] ?? null;
  const invoiceId = refund.metadata?.['invoiceId'] ?? null;
  if (userId === null || subscriptionId === null || invoiceId === null) {
    return;
  }

  await prisma.payment.update({
    where: { stripeRefundId: refund.id },
    data: { status: 'FAILED' },
  });

  //  later we could also email the user about the failed refund if we want
}
