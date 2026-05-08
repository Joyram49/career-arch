import * as AdminUserService from '@modules/admin/services/admin.users.service';
import { adminListUsersSchema } from '@modules/admin/validations/admin.users.validation';
import { sendSuccess } from '@shared/utils/apiResponse';
import { QueryBuilder } from '@shared/utils/queryBuilder';

import type { IAuthenticatedRequest } from '@app-types/index';
import type { Request, Response } from 'express';

// ── LIST USERS ─────────────────────────────────────────────────────────────

export async function listUsers(req: Request, res: Response): Promise<Response> {
  const query = new QueryBuilder(req, adminListUsersSchema.shape.query).build();
  const { users, meta } = await AdminUserService.listUsers(query);
  return sendSuccess(res, { users }, 'Users retrieved successfully', 200, meta);
}

// ── GET USER BY ID ─────────────────────────────────────────────────────────

export async function getUserById(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  const user = await AdminUserService.getUserById(id);
  return sendSuccess(res, { user }, 'User retrieved successfully');
}

// ── SUSPEND USER ───────────────────────────────────────────────────────────

export async function suspendUser(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  // sub is the logged-in admin's ID — used to prevent self-suspension
  const { sub } = (req as IAuthenticatedRequest).user;
  const user = await AdminUserService.suspendUser(id, sub);
  return sendSuccess(res, { user }, 'User suspended successfully');
}

// ── ACTIVATE USER ──────────────────────────────────────────────────────────

export async function activateUser(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };
  const { sub } = (req as IAuthenticatedRequest).user;
  const user = await AdminUserService.activateUser(id, sub);
  return sendSuccess(res, { user }, 'User activated successfully');
}
