/* eslint-disable no-nested-ternary */
import { prisma } from '@config/database';
import { env } from '@config/env';
import { logger } from '@config/logger';
import { stripe } from '@config/stripe';
import { sendPaymentFailedEmail } from '@services/email.service';
import * as SubscriptionService from '@services/subscription/subscription.service';
import { sendError, sendSuccess } from '@utils/apiResponse';

import type { Request, Response } from 'express';
import type Stripe from 'stripe';

/**
 * POST /webhooks/stripe
 *
 * IMPORTANT: This route must use express.raw({ type: 'application/json' })
 * instead of express.json(). Mounted before the global JSON middleware.
 * See webhook.routes.ts for setup.
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<Response> {
  const sig = req.headers['stripe-signature'];

  if (typeof sig !== 'string') {
    return sendError(res, 'Missing stripe-signature header', 400);
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    logger.warn(`Stripe webhook signature failed: ${message}`);
    return sendError(res, `Webhook Error: ${message}`, 400);
  }

  try {
    await routeStripeEvent(event);
  } catch (err) {
    // Log but always return 200 so Stripe doesn't retry indefinitely
    // for non-recoverable errors
    logger.error(`Stripe webhook handler error for ${event.type}:`, err);
  }

  // Always acknowledge to Stripe
  return sendSuccess(res, { received: true }, 'Webhook processed');
}

// ─────────────────────────────────────────────
// EVENT ROUTER
// ─────────────────────────────────────────────

async function routeStripeEvent(event: Stripe.Event): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
  switch (event.type) {
    case 'customer.subscription.created':
      await SubscriptionService.handleSubscriptionCreated(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      await SubscriptionService.handlePaymentSucceeded(event.data.object);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await SubscriptionService.handleSubscriptionDeleted(event.data.object);
      break;

    case 'customer.subscription.updated':
      await SubscriptionService.handleSubscriptionUpdated(event.data.object);
      break;

    case 'refund.created':
      await SubscriptionService.handleRefundCreated(event.data.object);
      break;
    case 'refund.updated':
      await SubscriptionService.handleRefundUpdated(event.data.object);
      break;

    case 'refund.failed':
      await SubscriptionService.handleRefundFailed(event.data.object);
      break;
    default:
      logger.info(`Unhandled Stripe event type: ${event.type}`);
  }
}

// ─────────────────────────────────────────────
// PAYMENT FAILED — needs email lookup
// ─────────────────────────────────────────────

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  await SubscriptionService.handlePaymentFailed(invoice);

  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id ?? null);

  if (customerId === null) return;
  const sub = await prisma.subscription.findFirst({
    where: {
      stripeCustomerId: customerId,
    },
    include: {
      user: {
        include: {
          profile: {
            select: {
              firstName: true,
            },
          },
        },
      },
    },
  });

  if (sub === null) return;

  const planName = sub.plan === 'BASIC' ? 'Basic' : sub.plan === 'PREMIUM' ? 'Premium' : 'Free';

  await sendPaymentFailedEmail(sub.user.email, sub.user.profile?.firstName ?? 'User', planName);
}
