import * as AdminOrgService from '@modules/admin/services/admin.orgs.service';
import { adminListOrgSchema } from '@modules/admin/validations/admin.orgs.validation';
import { sendSuccess } from '@shared/utils/apiResponse';
import { QueryBuilder } from '@shared/utils/queryBuilder';

import type { Request, Response } from 'express';

// ── GET /admin/organizations ───────────────────────────────────────────────
export async function listOrganizations(req: Request, res: Response): Promise<Response> {
  const query = new QueryBuilder(req, adminListOrgSchema.shape.query).build();

  const { data, meta } = await AdminOrgService.listOrganizations(query);

  return sendSuccess(res, { organizations: data }, 'Organizations retrieved', 200, meta);
}

// ── PATCH /admin/organizations/:id/approve ────────────────────────────────
export async function approveOrganization(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  const result = await AdminOrgService.approveOrganization(id);
  return sendSuccess(res, null, result.message);
}

// ── PATCH /admin/organizations/:id/suspend ────────────────────────────────
export async function suspendOrganization(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  const result = await AdminOrgService.suspendOrganization(id);
  return sendSuccess(res, null, result.message);
}

// ── PATCH /admin/organizations/:id/activate ───────────────────────────────
export async function activateOrganization(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  const result = await AdminOrgService.activateOrganization(id);
  return sendSuccess(res, null, result.message);
}
