import * as IncentiveService from '@modules/admin/services/admin.incentives.service';
import {
  adminListIncentivesSchema,
  type ResolveDisputeInput,
  type WaiveIncentiveInput,
} from '@modules/incentives/validations/incentive.validation';
import { sendSuccess } from '@shared/utils/apiResponse';
import { QueryBuilder } from '@shared/utils/queryBuilder';

import type { Request, Response } from 'express';

// ── GET /admin/incentives ──────────────────────────────────────────────────

export async function listIncentives(req: Request, res: Response): Promise<Response> {
  const query = new QueryBuilder(req, adminListIncentivesSchema.shape.query).build();

  const { incentives, meta } = await IncentiveService.listAdminIncentives(query);

  return sendSuccess(res, { incentives }, 'Incentives retrieved', 200, meta);
}

// ── GET /admin/incentives/stats ────────────────────────────────────────────

export async function getStats(_req: Request, res: Response): Promise<Response> {
  const stats = await IncentiveService.getIncentiveStats();

  return sendSuccess(res, { stats }, 'Incentive stats retrieved');
}

// ── GET /admin/incentives/:id ──────────────────────────────────────────────

export async function getIncentive(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };

  const incentive = await IncentiveService.getAdminIncentive(id);

  return sendSuccess(res, { incentive }, 'Incentive retrieved');
}

// ── POST /admin/incentives/:id/waive ──────────────────────────────────────

export async function waiveIncentive(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  const { reason } = req.body as WaiveIncentiveInput;

  const result = await IncentiveService.waiveIncentive(id, reason);

  return sendSuccess(res, null, result.message);
}

// ── POST /admin/incentives/:id/resolve-dispute ────────────────────────────

export async function resolveDispute(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  const { resolution, note } = req.body as ResolveDisputeInput;

  const result = await IncentiveService.resolveDispute(id, resolution, note);

  return sendSuccess(res, null, result.message);
}
