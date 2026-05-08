import { prisma } from '@config/database';
import { startOfWeek } from 'date-fns';

import { type IAdminDashboardStats } from '../types';

// ─────────────────────────────────────────────
// GET DASHBOARD STATS
// ─────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function
export async function getDashboardStats(): Promise<IAdminDashboardStats> {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday

  const [
    // Users
    totalUsers,
    activeUsers,
    newUsersThisWeek,
    // Orgs
    totalOrgs,
    approvedOrgs,
    pendingOrgs,
    newOrgsThisWeek,
    // Jobs
    jobsByStatus,
    // Applications
    totalApplications,
    hiredApplications,
    // Subscriptions
    activeByPlan,
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
    prisma.user.count({ where: { createdAt: { gte: weekStart } } }),

    // ── Organizations ─────────────────────────
    prisma.organization.count(),
    prisma.organization.count({ where: { isApproved: true } }),
    prisma.organization.count({ where: { isApproved: false, isEmailVerified: true } }),
    prisma.organization.count({ where: { createdAt: { gte: weekStart } } }),

    // ── Jobs ──────────────────────────────────
    prisma.job.groupBy({
      by: ['status'],
      where: { status: { not: 'ARCHIVED' } },
      _count: { status: true },
    }),

    // ── Applications ──────────────────────────
    prisma.application.count(),
    prisma.application.count({ where: { status: 'HIRED' } }),

    // ── Subscriptions ─────────────────────────
    prisma.subscription.groupBy({
      by: ['plan'],
      where: { status: 'ACTIVE', plan: { not: 'FREE' } },
      _count: { plan: true },
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

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      newThisWeek: newUsersThisWeek,
    },
    organizations: {
      total: totalOrgs,
      approved: approvedOrgs,
      pendingApproval: pendingOrgs,
      newThisWeek: newOrgsThisWeek,
    },
    jobs: {
      total: jobCounts.DRAFT + jobCounts.PUBLISHED + jobCounts.CLOSED,
      published: jobCounts.PUBLISHED,
      draft: jobCounts.DRAFT,
      closed: jobCounts.CLOSED,
    },
    applications: {
      total: totalApplications,
      hired: hiredApplications,
    },
    revenue: {
      mrrCents,
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
