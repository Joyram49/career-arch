import * as AdminPlanService from '@modules/admin/services/admin.plans.service';
import {
  type CreatePlanInput,
  type UpdatePlanInput,
} from '@modules/admin/validations/admin.plans.validation';
import { sendCreated, sendNoContent, sendSuccess } from '@shared/utils/apiResponse';

import type { Request, Response } from 'express';

// ── List all plans (admin — includes inactive) ────────────────────────────
export async function listPlans(_req: Request, res: Response): Promise<Response> {
  const plans = await AdminPlanService.listAllPlans();
  return sendSuccess(res, { plans }, 'Plans retrieved');
}

// ── Get single plan ───────────────────────────────────────────────────────
export async function getPlan(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  const plan = await AdminPlanService.getPlanById(id);
  return sendSuccess(res, { plan }, 'Plan retrieved');
}

// ── Create plan (syncs to Stripe) ─────────────────────────────────────────
export async function createPlan(req: Request, res: Response): Promise<Response> {
  const plan = await AdminPlanService.createPlan(req.body as CreatePlanInput);
  return sendCreated(res, { plan }, 'Plan created and synced to Stripe');
}

// ── Update plan ───────────────────────────────────────────────────────────
export async function updatePlan(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  const plan = await AdminPlanService.updatePlan(id, req.body as UpdatePlanInput);
  return sendSuccess(res, { plan }, 'Plan updated');
}

// ── Toggle active ─────────────────────────────────────────────────────────
export async function togglePlan(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  const plan = await AdminPlanService.togglePlanActive(id);
  return sendSuccess(res, { plan }, `Plan ${plan.isActive ? 'activated' : 'deactivated'}`);
}

// ── Delete plan ───────────────────────────────────────── ──────────────────
export async function deletePlan(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  await AdminPlanService.deletePlan(id);
  return sendNoContent(res);
}
