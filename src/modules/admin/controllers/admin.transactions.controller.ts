import * as AdminTransactionsService from '@modules/admin/services/admin.transactions.service';
import { type TransactionsChartRange } from '@modules/admin/types';
import { adminListTransactionsSchema } from '@modules/admin/validations/admin.transactions.validation';
import { sendSuccess } from '@shared/utils/apiResponse';
import { QueryBuilder } from '@shared/utils/queryBuilder';

import type { Request, Response } from 'express';

// ── GET /admin/transactions ────────────────────────────────────────────────
export async function listTransactions(req: Request, res: Response): Promise<Response> {
  const query = new QueryBuilder(req, adminListTransactionsSchema.shape.query).build();

  const { data, meta } = await AdminTransactionsService.listTransactions(query);

  return sendSuccess(res, { transactions: data }, 'Transactions retrieved', 200, meta);
}

// ── GET /admin/transactions/stats ──────────────────────────────────────────
export async function getTransactionStats(_req: Request, res: Response): Promise<Response> {
  const stats = await AdminTransactionsService.getTransactionStats();

  return sendSuccess(res, { stats }, 'Transaction stats retrieved');
}

// ── GET /admin/transactions/chart ──────────────────────────────────────────
const VALID_CHART_RANGES: readonly TransactionsChartRange[] = [
  '7w',
  '30d',
  '2m',
  '3m',
  '6m',
  '1y',
  '2y',
  '3y',
  '5y',
];

function isValidChartRange(value: unknown): value is TransactionsChartRange {
  return typeof value === 'string' && VALID_CHART_RANGES.includes(value as TransactionsChartRange);
}

export async function getRevenueTimeline(req: Request, res: Response): Promise<Response> {
  const rangeParam = req.query['range'];
  const range: TransactionsChartRange = isValidChartRange(rangeParam) ? rangeParam : '30d';

  const timeline = await AdminTransactionsService.getTransactionsRevenueTimeline(range);

  return sendSuccess(res, { timeline }, 'Revenue timeline retrieved');
}

// ── GET /admin/transactions/:id ────────────────────────────────────────────
export async function getTransaction(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as { id: string };

  const transaction = await AdminTransactionsService.getTransactionById(id);

  return sendSuccess(res, { transaction }, 'Transaction retrieved');
}
