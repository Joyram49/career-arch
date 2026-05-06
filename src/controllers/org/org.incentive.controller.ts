import * as IncentiveService from '@services/incentive/incentive.service';
import { sendSuccess } from '@utils/apiResponse';

import { QueryBuilder } from '@/utils/queryBuilder';
import {
  listOrgIncentivesSchema,
  type DisputeIncentiveInput,
} from '@/validations/incentive.validation';

import type { IAuthenticatedRequest } from '@app-types/index';
import type { Request, Response } from 'express';

// ── GET /org/incentives ────────────────────────────────────────────────────

export async function listIncentives(req: Request, res: Response): Promise<Response> {
  const { sub: orgId } = (req as IAuthenticatedRequest).user;
  const query = new QueryBuilder(req, listOrgIncentivesSchema.shape.query).build();

  const { incentives, meta } = await IncentiveService.listOrgIncentives(orgId, query);

  return sendSuccess(res, { incentives }, 'Incentives retrieved', 200, meta);
}

// ── GET /org/incentives/:id ────────────────────────────────────────────────

export async function getIncentive(req: Request, res: Response): Promise<Response> {
  const { sub: orgId } = (req as IAuthenticatedRequest).user;
  const { id } = req.params as { id: string };

  const incentive = await IncentiveService.getOrgIncentive(orgId, id);

  return sendSuccess(res, { incentive }, 'Incentive retrieved');
}

// ── POST /org/incentives/:id/pay ───────────────────────────────────────────

export async function payIncentive(req: Request, res: Response): Promise<Response> {
  const { sub: orgId } = (req as IAuthenticatedRequest).user;
  const { id } = req.params as { id: string };

  const result = await IncentiveService.payIncentive(orgId, id);

  return sendSuccess(res, result, 'Payment successful. Thank you!');
}

// ── POST /org/incentives/:id/dispute ──────────────────────────────────────

export async function disputeIncentive(req: Request, res: Response): Promise<Response> {
  const { sub: orgId } = (req as IAuthenticatedRequest).user;
  const { id } = req.params as { id: string };
  const { reason } = req.body as DisputeIncentiveInput;

  const result = await IncentiveService.disputeIncentive(orgId, id, reason);

  return sendSuccess(res, null, result.message);
}
