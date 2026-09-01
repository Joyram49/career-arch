import * as AdminStatsService from '@modules/admin/services/admin.stats.service';
import { type ChartRange, type RevenueTrendRange } from '@modules/admin/types';
import { sendSuccess } from '@shared/utils/apiResponse';

import type { Request, Response } from 'express';

// ── GET /admin/dashboard/stats ─────────────────────────────────────────────

export async function getDashboardStats(_req: Request, res: Response): Promise<Response> {
  const stats = await AdminStatsService.getDashboardStats();
  return sendSuccess(res, { stats }, 'Dashboard stats retrieved');
}

// ── GET /admin/dashboard/registration-chart ─────────────────────────────────────────────
const VALID_RANGES: readonly ChartRange[] = ['30d', '2m', '3m', '6m', '1y', '2y', '3y', '5y'];

function isValidRange(value: unknown): value is ChartRange {
  return typeof value === 'string' && VALID_RANGES.includes(value as ChartRange);
}

const VALID_REVENUE_TREND_RANGES: readonly RevenueTrendRange[] = ['7w', ...VALID_RANGES];

function isValidRevenueTrendRange(v: unknown): v is RevenueTrendRange {
  return typeof v === 'string' && VALID_REVENUE_TREND_RANGES.includes(v as RevenueTrendRange);
}

export async function getRegistrationChart(req: Request, res: Response): Promise<Response> {
  const rangeParam = req.query['range'];
  const range: ChartRange = isValidRange(rangeParam) ? rangeParam : '30d';

  const chartData = await AdminStatsService.getRegistrationChart(range);
  return sendSuccess(res, { chartData }, 'Registration chart data retrieved');
}

// ── GET /admin/dashboard/revenue-trend-chart ─────────────────────────────────────────────
export async function getRevenueTrend(req: Request, res: Response): Promise<Response> {
  const rangeParam = req.query['range'];
  const range: RevenueTrendRange = isValidRevenueTrendRange(rangeParam) ? rangeParam : '7w';
  const revenueTrend = await AdminStatsService.getRevenueTrend(range);
  return sendSuccess(res, { revenueTrend }, 'Revenue trend retrieved');
}

// ── GET /admin/dashboard/revenue-chart ─────────────────────────────────────────────
export async function getRevenueByPlan(req: Request, res: Response): Promise<Response> {
  const rangeParam = req.query['range'];
  const range: ChartRange = isValidRange(rangeParam) ? rangeParam : '30d';
  const revenueByPlan = await AdminStatsService.getRevenueByPlan(range);
  return sendSuccess(res, { revenueByPlan }, 'Revenue by plan retrieved');
}
