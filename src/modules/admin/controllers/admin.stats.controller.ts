import * as AdminStatsService from '@modules/admin/services/admin.stats.service';
import { sendSuccess } from '@shared/utils/apiResponse';

import type { Request, Response } from 'express';

// ── GET /admin/dashboard/stats ─────────────────────────────────────────────

export async function getDashboardStats(_req: Request, res: Response): Promise<Response> {
  const stats = await AdminStatsService.getDashboardStats();
  return sendSuccess(res, { stats }, 'Dashboard stats retrieved');
}
