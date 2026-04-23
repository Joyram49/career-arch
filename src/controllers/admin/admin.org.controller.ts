import * as AdminOrgService from '@services/admin/admin.org.service';
import { sendSuccess } from '@utils/apiResponse';
import { buildPaginationMeta, parsePagination } from '@utils/pagination';

import type { Request, Response } from 'express';

// ── GET /admin/organizations ───────────────────────────────────────────────
export async function listOrganizations(req: Request, res: Response): Promise<Response> {
  const { page, limit } = parsePagination(req.query);

  // Optional filters from query string
  const query = req.query as Record<string, string>;
  const isApproved = query['isApproved'] !== undefined ? query['isApproved'] === 'true' : undefined;
  const isActive = query['isActive'] !== undefined ? query['isActive'] === 'true' : undefined;

  const filters: { isApproved?: boolean; isActive?: boolean; page: number; limit: number } = {
    page,
    limit,
  };
  if (isApproved !== undefined) filters.isApproved = isApproved;
  if (isActive !== undefined) filters.isActive = isActive;

  const { data, total } = await AdminOrgService.listOrganizations(filters);

  const meta = buildPaginationMeta(total, page, limit);
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
