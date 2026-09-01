import { prisma } from '@config/database';
import {
  buildBucketWindows,
  formatBucketLabel,
  getDateRange,
} from '@modules/admin/utils/date-bucket.utils';
import { startOfMonth, startOfWeek, subMonths, subWeeks } from 'date-fns';

import {
  type ChartRange,
  type IAdminDashboardStats,
  type IRegistrationBucket,
  type IRegistrationChartData,
  type IRevenueByPlanData,
  type IRevenueTrendBucket,
  type IRevenueTrendData,
  type RevenueTrendRange,
} from '../types';

// ─────────────────────────────────────────────
// GET DASHBOARD STATS
// ─────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function
export async function getDashboardStats(): Promise<IAdminDashboardStats> {
  const now = new Date();

  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const previousWeekStart = subWeeks(thisWeekStart, 1);

  const thisMonthStart = startOfMonth(now);
  const prevMonthStart = subMonths(thisMonthStart, 1);

  const [
    // Users
    totalUsers,
    activeUsers,
    newUsersThisWeek,
    newUsersPrevWeek,
    // Orgs
    totalOrgs,
    approvedOrgs,
    pendingOrgs,
    newOrgsThisWeek,
    newOrgsPrevWeek,
    // Jobs
    jobsByStatus,
    newJobsThisMonth,
    newJobsPrevMonth,
    // Applications
    totalApplications,
    hiredApplications,
    // Subscriptions
    activeByPlan,
    previousMonthMrr,
    // Incentives
    pendingIncentives,
    overdueIncentives,
    collectedIncentives,
    // Plans for MRR
    plans,
  ] = await Promise.all([
    // ── Users ────────────────────────────────
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { createdAt: { gte: thisWeekStart } } }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: previousWeekStart,
          lt: thisWeekStart,
        },
      },
    }),

    // ── Organizations ─────────────────────────
    prisma.organization.count(),
    prisma.organization.count({ where: { isApproved: true } }),
    prisma.organization.count({ where: { isApproved: false, isEmailVerified: true } }),
    prisma.organization.count({ where: { createdAt: { gte: thisWeekStart } } }),
    prisma.organization.count({
      where: {
        createdAt: {
          gte: previousWeekStart,
          lt: thisWeekStart,
        },
      },
    }),

    // ── Jobs ──────────────────────────────────
    prisma.job.groupBy({
      by: ['status'],
      where: { status: { not: 'ARCHIVED' } },
      _count: { status: true },
    }),
    prisma.job.count({
      where: { createdAt: { gte: thisMonthStart }, status: { not: 'ARCHIVED' } },
    }),
    prisma.job.count({
      where: { createdAt: { gte: prevMonthStart }, status: { not: 'ARCHIVED' } },
    }),

    // ── Applications ──────────────────────────
    prisma.application.count(),
    prisma.application.count({ where: { status: 'HIRED' } }),

    // ── Current subscriptions ─────────────────
    prisma.subscription.groupBy({
      by: ['plan'],
      where: { status: 'ACTIVE', plan: { not: 'FREE' } },
      _count: { plan: true },
    }),

    // ── Previous month subscriptions ──────────
    prisma.payment.aggregate({
      where: {
        type: 'SUBSCRIPTION',
        status: 'SUCCEEDED',
        createdAt: {
          gte: prevMonthStart,
          lt: thisMonthStart,
        },
      },
      _sum: {
        amount: true,
      },
    }),

    // ── Incentives ────────────────────────────
    prisma.hiringIncentive.aggregate({
      where: { status: 'PENDING' },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.hiringIncentive.count({ where: { status: 'OVERDUE' } }),
    prisma.hiringIncentive.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
    }),

    // ── Plans for MRR calculation ──────────────
    prisma.planCatalogue.findMany({
      where: { key: { in: ['BASIC', 'PREMIUM'] } },
      select: { key: true, monthlyPriceCents: true },
    }),
  ]);

  // ── Compute job counts by status ───────────────────────────────────────
  const jobCounts = { DRAFT: 0, PUBLISHED: 0, CLOSED: 0 };
  for (const row of jobsByStatus) {
    if (row.status in jobCounts) {
      jobCounts[row.status as keyof typeof jobCounts] = row._count.status;
    }
  }

  // ── Compute subscription counts ────────────────────────────────────────
  const subCounts = { BASIC: 0, PREMIUM: 0 };
  for (const row of activeByPlan) {
    if (row.plan === 'BASIC') subCounts.BASIC = row._count.plan;
    if (row.plan === 'PREMIUM') subCounts.PREMIUM = row._count.plan;
  }

  // ── Compute MRR ────────────────────────────────────────────────────────
  const priceMap = Object.fromEntries(plans.map((p) => [p.key, p.monthlyPriceCents]));
  const mrrCents =
    subCounts.BASIC * (priceMap['BASIC'] ?? 0) + subCounts.PREMIUM * (priceMap['PREMIUM'] ?? 0);

  // compute previous month mrr ────────────────────────────────────────────────────
  const previousMrrCents = Math.round((previousMonthMrr._sum.amount ?? 0) * 100);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      newThisWeek: newUsersThisWeek,
      userPrevWeek: newUsersPrevWeek,
    },
    organizations: {
      total: totalOrgs,
      approved: approvedOrgs,
      pendingApproval: pendingOrgs,
      newThisWeek: newOrgsThisWeek,
      orgsPrevWeek: newOrgsPrevWeek,
    },
    jobs: {
      total: jobCounts.DRAFT + jobCounts.PUBLISHED + jobCounts.CLOSED,
      published: jobCounts.PUBLISHED,
      draft: jobCounts.DRAFT,
      closed: jobCounts.CLOSED,
      newJobThisMonth: newJobsThisMonth,
      newJobPrevMonth: newJobsPrevMonth,
    },
    applications: {
      total: totalApplications,
      hired: hiredApplications,
    },
    revenue: {
      mrrCents,
      previousMrrCents,
      activeBasic: subCounts.BASIC,
      activePremium: subCounts.PREMIUM,
    },
    incentives: {
      totalPendingCents: Math.round((pendingIncentives._sum.amount ?? 0) * 100),
      totalPendingCount: pendingIncentives._count.id,
      totalOverdueCount: overdueIncentives,
      totalCollectedCents: Math.round((collectedIncentives._sum.amount ?? 0) * 100),
    },
  };
}

// ─────────────────────────────────────────────
// GET REGISTRATION CHART (users vs orgs, bucketed)
// ─────────────────────────────────────────────
const BUCKET_COUNT = 10;

const RANGE_TO_DAYS: Record<ChartRange, number> = {
  '30d': 30,
  '2m': 60,
  '3m': 90,
  '6m': 180,
  '1y': 365,
  '2y': 730,
  '3y': 1095,
  '5y': 1825,
};

export async function getRegistrationChart(
  range: ChartRange = '30d',
): Promise<IRegistrationChartData> {
  const totalDays = RANGE_TO_DAYS[range];
  const { startDate, endDate } = getDateRange(totalDays);
  const windows = buildBucketWindows(startDate, endDate, BUCKET_COUNT);

  const counts = await Promise.all(
    windows.map(({ bucketStart, bucketEnd }) =>
      Promise.all([
        prisma.user.count({ where: { createdAt: { gte: bucketStart, lt: bucketEnd } } }),
        prisma.organization.count({ where: { createdAt: { gte: bucketStart, lt: bucketEnd } } }),
      ]),
    ),
  );

  const buckets: IRegistrationBucket[] = windows.map(({ bucketStart, bucketEnd }, i) => ({
    label: formatBucketLabel(bucketStart, totalDays),
    startDate: bucketStart.toISOString(),
    endDate: bucketEnd.toISOString(),
    users: counts[i]?.[0] ?? 0,
    orgs: counts[i]?.[1] ?? 0,
  }));

  return { range, buckets };
}

// ── Weekly Revenue Trend (subscriptions + incentives combined) ─────────────

const REVENUE_TREND_RANGE_DAYS: Record<RevenueTrendRange, number> = {
  '7w': 49,
  ...RANGE_TO_DAYS,
};

const REVENUE_TREND_BUCKET_COUNT = 7;

export async function getRevenueTrend(range: RevenueTrendRange = '7w'): Promise<IRevenueTrendData> {
  const totalDays = REVENUE_TREND_RANGE_DAYS[range];
  const { startDate, endDate } = getDateRange(totalDays);
  const windows = buildBucketWindows(startDate, endDate, REVENUE_TREND_BUCKET_COUNT);

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
      ]),
    ),
  );

  const buckets: IRevenueTrendBucket[] = windows.map(({ bucketStart }, i) => {
    const subscriptionRevenueCents = Math.round((sums[i]?.[0]._sum.amount ?? 0) * 100);
    const incentiveRevenueCents = Math.round((sums[i]?.[1]._sum.amount ?? 0) * 100);
    return {
      label: formatBucketLabel(bucketStart, totalDays),
      startDate: bucketStart.toISOString(),
      endDate: windows[i]?.bucketEnd.toISOString() ?? new Date().toDateString(),
      subscriptionRevenueCents,
      incentiveRevenueCents,
      totalRevenueCents: subscriptionRevenueCents + incentiveRevenueCents,
    };
  });

  return { range, buckets };
}

// ── Revenue by Plan (snapshot for a date range) ─────────────────────────────
export async function getRevenueByPlan(range: ChartRange = '30d'): Promise<IRevenueByPlanData> {
  const totalDays = RANGE_TO_DAYS[range];
  const { startDate, endDate } = getDateRange(totalDays);

  const [basicAgg, premiumAgg] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        type: 'SUBSCRIPTION',
        status: 'SUCCEEDED',
        createdAt: { gte: startDate, lt: endDate },
        subscription: { plan: 'BASIC' },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        type: 'SUBSCRIPTION',
        status: 'SUCCEEDED',
        createdAt: { gte: startDate, lt: endDate },
        subscription: { plan: 'PREMIUM' },
      },
      _sum: { amount: true },
    }),
  ]);

  const basicCents = Math.round((basicAgg._sum.amount ?? 0) * 100);
  const premiumCents = Math.round((premiumAgg._sum.amount ?? 0) * 100);

  return {
    range,
    totalCents: basicCents + premiumCents,
    breakdown: [
      { plan: 'FREE', amountCents: 0 }, // FREE plan never generates revenue
      { plan: 'BASIC', amountCents: basicCents },
      { plan: 'PREMIUM', amountCents: premiumCents },
    ],
  };
}
