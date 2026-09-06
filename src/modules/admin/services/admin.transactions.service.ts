import { prisma } from '@config/database';
import {
  buildBucketWindows,
  formatBucketLabel,
  getDateRange,
} from '@modules/admin/utils/date-bucket.utils';
import { type AdminListTransactionsQuery } from '@modules/admin/validations/admin.transactions.validation';
import { type Prisma } from '@prisma/client';
import { buildPaginationMeta } from '@shared/utils/pagination';
import { extractPagination } from '@shared/utils/queryBuilder';
import { startOfDay, startOfMonth, subMonths } from 'date-fns';

import { NotFoundError } from '@/shared/utils/apiError';

import {
  type IAdminTransactionDetail,
  type IAdminTransactionListItem,
  type IAdminTransactionStats,
  type IRevenueTimelineBucket,
  type IRevenueTimelineData,
  type TransactionsChartRange,
} from '../types';

// ─────────────────────────────────────────────
// LIST TRANSACTIONS (paginated + filterable)
// ─────────────────────────────────────────────

export async function listTransactions(query: AdminListTransactionsQuery): Promise<{
  data: IAdminTransactionListItem[];
  meta: ReturnType<typeof buildPaginationMeta>;
}> {
  const { search, type, status, sortBy, sortOrder } = query;
  const { page, limit, skip } = extractPagination(query);

  const where: Prisma.PaymentWhereInput = {};

  if (type !== undefined) {
    where.type = type;
  }

  if (status !== undefined) {
    where.status = status;
  }

  // Keyword search — description, user (email/name), organization (email/companyName)
  if (search !== undefined && search.length > 0) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { profile: { firstName: { contains: search, mode: 'insensitive' } } } },
      { user: { profile: { lastName: { contains: search, mode: 'insensitive' } } } },
      { organization: { email: { contains: search, mode: 'insensitive' } } },
      {
        organization: {
          profile: { companyName: { contains: search, mode: 'insensitive' } },
        },
      },
    ];
  }

  const direction: Prisma.SortOrder = sortOrder;
  const orderBy: Prisma.PaymentOrderByWithRelationInput =
    sortBy === 'amount' ? { amount: direction } : { createdAt: direction };

  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        currency: true,
        description: true,
        stripePaymentIntentId: true,
        stripeInvoiceId: true,
        stripeRefundId: true,
        stripeChargeId: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        organization: {
          select: {
            id: true,
            email: true,
            profile: { select: { companyName: true } },
          },
        },
        subscription: {
          select: { id: true, plan: true },
        },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    data: rows.map(mapTransaction),
    meta: buildPaginationMeta(total, page, limit),
  };
}

// ─────────────────────────────────────────────
// TRANSACTION STATS
// ─────────────────────────────────────────────

export async function getTransactionStats(): Promise<IAdminTransactionStats> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const thisMonthStart = startOfMonth(now);
  const prevMonthStart = subMonths(thisMonthStart, 1);

  const [
    monthlyAgg,
    prevMonthAgg,
    todayAgg,
    refundedAgg,
    failedAgg,
    pendingAgg,
    subscriptionMonthAgg,
    incentiveMonthAgg,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: 'SUCCEEDED', createdAt: { gte: thisMonthStart } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: { status: 'SUCCEEDED', createdAt: { gte: prevMonthStart, lt: thisMonthStart } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: 'SUCCEEDED', createdAt: { gte: todayStart } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: { status: 'REFUNDED' },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: { status: 'FAILED' },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: { status: 'PENDING' },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: { status: 'SUCCEEDED', type: 'SUBSCRIPTION', createdAt: { gte: thisMonthStart } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: 'SUCCEEDED', type: 'INCENTIVE', createdAt: { gte: thisMonthStart } },
      _sum: { amount: true },
    }),
  ]);

  const toCents = (value: number | null): number => Math.round((value ?? 0) * 100);

  return {
    monthlyRevenueCents: toCents(monthlyAgg._sum.amount),
    previousMonthRevenueCents: toCents(prevMonthAgg._sum.amount),
    monthlyTransactionCount: monthlyAgg._count.id,
    todayRevenueCents: toCents(todayAgg._sum.amount),
    todayTransactionCount: todayAgg._count.id,
    totalRefundedCents: toCents(refundedAgg._sum.amount),
    totalRefundedCount: refundedAgg._count.id,
    totalFailedCents: toCents(failedAgg._sum.amount),
    totalFailedCount: failedAgg._count.id,
    totalPendingCents: toCents(pendingAgg._sum.amount),
    totalPendingCount: pendingAgg._count.id,
    revenueBySourceThisMonth: {
      subscriptionCents: toCents(subscriptionMonthAgg._sum.amount),
      incentiveCents: toCents(incentiveMonthAgg._sum.amount),
    },
  };
}

// ─────────────────────────────────────────────
// REVENUE TIMELINE (subscriptions + incentives, bucketed)
// ─────────────────────────────────────────────

const CHART_RANGE_TO_DAYS: Record<TransactionsChartRange, number> = {
  '7w': 49,
  '30d': 30,
  '2m': 60,
  '3m': 90,
  '6m': 180,
  '1y': 365,
  '2y': 730,
  '3y': 1095,
  '5y': 1825,
};

const CHART_BUCKET_COUNT = 10;

export async function getTransactionsRevenueTimeline(
  range: TransactionsChartRange = '30d',
): Promise<IRevenueTimelineData> {
  const totalDays = CHART_RANGE_TO_DAYS[range];
  const { startDate, endDate } = getDateRange(totalDays);
  const windows = buildBucketWindows(startDate, endDate, CHART_BUCKET_COUNT);

  const sums = await Promise.all(
    windows.map(({ bucketStart, bucketEnd }) =>
      Promise.all([
        prisma.payment.aggregate({
          where: {
            type: 'SUBSCRIPTION',
            status: 'SUCCEEDED',
            createdAt: { gte: bucketStart, lt: bucketEnd },
          },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            type: 'INCENTIVE',
            status: 'SUCCEEDED',
            createdAt: { gte: bucketStart, lt: bucketEnd },
          },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: { status: 'REFUNDED', createdAt: { gte: bucketStart, lt: bucketEnd } },
          _sum: { amount: true },
        }),
      ]),
    ),
  );

  const buckets: IRevenueTimelineBucket[] = windows.map(({ bucketStart, bucketEnd }, i) => {
    const subscriptionRevenueCents = Math.round((sums[i]?.[0]._sum.amount ?? 0) * 100);
    const incentiveRevenueCents = Math.round((sums[i]?.[1]._sum.amount ?? 0) * 100);
    const refundedCents = Math.round((sums[i]?.[2]._sum.amount ?? 0) * 100);

    return {
      label: formatBucketLabel(bucketStart, totalDays),
      startDate: bucketStart.toISOString(),
      endDate: bucketEnd.toISOString(),
      subscriptionRevenueCents,
      incentiveRevenueCents,
      refundedCents,
      netRevenueCents: subscriptionRevenueCents + incentiveRevenueCents - refundedCents,
    };
  });

  return { range, buckets };
}

// ─────────────────────────────────────────────
// GET SINGLE TRANSACTION
// ─────────────────────────────────────────────

export async function getTransactionById(id: string): Promise<IAdminTransactionDetail> {
  const row = await prisma.payment.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      status: true,
      amount: true,
      currency: true,
      description: true,
      metaData: true,
      stripePaymentIntentId: true,
      stripeInvoiceId: true,
      stripeRefundId: true,
      stripeChargeId: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
      organization: {
        select: {
          id: true,
          email: true,
          profile: { select: { companyName: true } },
        },
      },
      subscription: { select: { id: true, plan: true } },
    },
  });

  if (row === null) throw new NotFoundError('Transaction not found');

  return { ...mapTransaction(row), metaData: row.metaData };
}

// ─────────────────────────────────────────────
// INTERNAL MAPPER
// ─────────────────────────────────────────────

type PaymentRow = Prisma.PaymentGetPayload<{
  select: {
    id: true;
    type: true;
    status: true;
    amount: true;
    currency: true;
    description: true;
    stripePaymentIntentId: true;
    stripeInvoiceId: true;
    stripeRefundId: true;
    stripeChargeId: true;
    createdAt: true;
    updatedAt: true;
    user: {
      select: {
        id: true;
        email: true;
        profile: { select: { firstName: true; lastName: true } };
      };
    };
    organization: {
      select: {
        id: true;
        email: true;
        profile: { select: { companyName: true } };
      };
    };
    subscription: { select: { id: true; plan: true } };
  };
}>;

function mapTransaction(row: PaymentRow): IAdminTransactionListItem {
  const userName =
    row.user?.profile !== null && row.user?.profile !== undefined
      ? `${row.user.profile.firstName} ${row.user.profile.lastName}`.trim()
      : null;

  return {
    id: row.id,
    type: row.type,
    status: row.status,
    amountCents: Math.round(row.amount * 100),
    currency: row.currency,
    description: row.description,
    stripePaymentIntentId: row.stripePaymentIntentId,
    stripeInvoiceId: row.stripeInvoiceId,
    stripeRefundId: row.stripeRefundId,
    stripeChargeId: row.stripeChargeId,
    isRefunded: row.status === 'REFUNDED' || row.stripeRefundId !== null,
    isFailed: row.status === 'FAILED',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: row.user !== null ? { id: row.user.id, email: row.user.email, name: userName } : null,
    organization:
      row.organization !== null
        ? {
            id: row.organization.id,
            email: row.organization.email,
            companyName: row.organization.profile?.companyName ?? null,
          }
        : null,
    subscription:
      row.subscription !== null
        ? { id: row.subscription.id, plan: row.subscription.plan, billingCycle: 'MONTHLY' }
        : null,
  };
}
