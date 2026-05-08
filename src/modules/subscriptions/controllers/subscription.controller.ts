import * as SubscriptionService from '@modules/subscriptions/services/subscription.service';
import { sendSuccess } from '@shared/utils/apiResponse';

import type { IAuthenticatedRequest } from '@app-types/index';
import type { Request, Response } from 'express';

// ── Public — pricing page ─────────────────────────────────────────────────
export async function getPublicPlans(_req: Request, res: Response): Promise<Response> {
  const plans = await SubscriptionService.getPublicPlans();
  return sendSuccess(res, { plans }, 'Plans retrieved');
}

// ── My subscription + usage ───────────────────────────────────────────────
export async function getMySubscription(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const subscription = await SubscriptionService.getMySubscription(sub);
  return sendSuccess(res, { subscription }, 'Subscription retrieved');
}

// ── Create Stripe checkout session ────────────────────────────────────────
export async function checkout(req: Request, res: Response): Promise<Response> {
  const { sub, email } = (req as IAuthenticatedRequest).user;
  const { plan } = req.body as { plan: 'BASIC' | 'PREMIUM' };

  const result = await SubscriptionService.createCheckoutSession(sub, email, plan);
  return sendSuccess(res, result, 'Checkout session created');
}

// ── Cancel subscription ───────────────────────────────────────────────────
export async function cancelSubscription(req: Request, res: Response): Promise<Response> {
  const { sub, email } = (req as IAuthenticatedRequest).user;

  // Fetch first name for email
  const { prisma } = await import('@config/database');
  const user = await prisma.user.findUnique({
    where: { id: sub },
    include: { profile: { select: { firstName: true } } },
  });
  const firstName = user?.profile?.firstName ?? 'User';

  const result = await SubscriptionService.cancelSubscription(sub, email, firstName);
  return sendSuccess(res, { currentPeriodEnd: result.currentPeriodEnd }, result.message);
}

// ── Reactivate subscription ───────────────────────────────────────────────
export async function reactivateSubscription(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const result = await SubscriptionService.reactivateSubscription(sub);
  return sendSuccess(res, null, result.message);
}

// ── List invoices ─────────────────────────────────────────────────────────
export async function listInvoices(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const invoices = await SubscriptionService.listInvoices(sub);
  return sendSuccess(res, { invoices }, 'Invoices retrieved');
}
