import * as AdminPlanService from '@modules/admin/services/admin.subscriptions.service';
import { adminListSubscriptionsSchema } from '@modules/admin/validations/admin.subscriptions.validation';
import { sendSuccess } from '@shared/utils/apiResponse';
import { QueryBuilder } from '@shared/utils/queryBuilder';

import type { Request, Response } from 'express';

// ── List subscriptions (paginated) ────────────────────────────────────────
export async function listSubscriptions(req: Request, res: Response): Promise<Response> {
  const query = new QueryBuilder(req, adminListSubscriptionsSchema.shape.query).build();

  const { subscriptions, meta } = await AdminPlanService.listSubscriptions(query);

  return sendSuccess(res, { subscriptions }, 'Subscriptions retrieved', 200, meta);
}

// ── Subscription stats ────────────────────────────────────────────────────
export async function getSubscriptionStats(_req: Request, res: Response): Promise<Response> {
  const stats = await AdminPlanService.getSubscriptionStats();
  return sendSuccess(res, { stats }, 'Subscription stats retrieved');
}

// ── Get single subscription ───────────────────────────────────────────────
export async function getSubscription(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  // Re-use list with exact ID filter for simplicity
  const { subscriptions } = await AdminPlanService.listSubscriptions({ page: 1, limit: 1 });
  const sub = subscriptions.find((s: { id: string }) => s.id === id);
  if (sub === undefined) {
    return sendSuccess(res, null, 'Subscription not found', 404);
  }
  return sendSuccess(res, { subscription: sub }, 'Subscription retrieved');
}

// ── Force cancel ──────────────────────────────────────────────────────────
export async function forceCancel(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  const result = await AdminPlanService.adminForceCancel(id);
  return sendSuccess(res, null, result.message);
}

// ── Refund last invoice ───────────────────────────────────────────────────
export async function refundLastInvoice(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  const { reason } = req.body as {
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  };
  const result = await AdminPlanService.adminRefundLastInvoice(id, reason);
  return sendSuccess(res, { refundId: result.refundId }, result.message);
}
