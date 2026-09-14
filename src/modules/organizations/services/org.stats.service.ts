import { prisma } from '@/config/database';

import {
  type IOrgDashboardStats,
  type IOrgJobPerformanceItem,
  type IOrgRecentApplicant,
} from '../types';

import type { IPaginationMeta } from '@app-types/index';

// Monday-start week, matching the "X this week" stats to a predictable
// reset point rather than a rolling 7-day window.
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─────────────────────────────────────────────
// GET /org/dashboard/stats
// ─────────────────────────────────────────────

export async function getOrgDashboardStats(orgId: string): Promise<IOrgDashboardStats> {
  const now = new Date();
  const weekStart = getStartOfWeek(now);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86_400_000);

  const [
    activeJobListings,
    jobsExpiringSoon,
    totalApplications,
    newApplicationsThisWeek,
    interviewsScheduled,
    interviewsThisWeek,
    successfulHires,
    pendingIncentives,
  ] = await Promise.all([
    prisma.job.count({ where: { orgId, status: 'PUBLISHED' } }),
    prisma.job.count({
      where: { orgId, status: 'PUBLISHED', deadline: { gte: now, lte: sevenDaysFromNow } },
    }),
    prisma.application.count({ where: { job: { orgId } } }),
    prisma.application.count({ where: { job: { orgId }, appliedAt: { gte: weekStart } } }),
    prisma.application.count({ where: { job: { orgId }, status: 'INTERVIEW_SCHEDULED' } }),
    prisma.application.count({
      where: { job: { orgId }, status: 'INTERVIEW_SCHEDULED', updatedAt: { gte: weekStart } },
    }),
    prisma.application.count({ where: { job: { orgId }, status: 'HIRED' } }),
    prisma.hiringIncentive.aggregate({
      where: { orgId, status: { in: ['PENDING', 'OVERDUE'] } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  return {
    activeJobListings,
    jobsExpiringSoon,
    totalApplications,
    newApplicationsThisWeek,
    interviewsScheduled,
    interviewsThisWeek,
    successfulHires,
    pendingIncentiveAmount: pendingIncentives._sum.amount ?? 0,
    pendingIncentiveCount: pendingIncentives._count._all,
  };
}

// ─────────────────────────────────────────────
// GET /org/dashboard/jobs-performance
// ─────────────────────────────────────────────

export async function getOrgJobsPerformance(
  orgId: string,
  page: number,
  limit: number,
): Promise<{ jobs: IOrgJobPerformanceItem[]; meta: IPaginationMeta }> {
  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { _count: { select: { applications: true } } },
    }),
    prisma.job.count({ where: { orgId } }),
  ]);

  const items: IOrgJobPerformanceItem[] = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    slug: job.slug,
    status: job.status,
    requiredPlan: job.requiredPlan,
    applicationsCount: job._count.applications,
    views: job.views,
    daysActive: job.publishedAt
      ? Math.max(0, Math.floor((Date.now() - job.publishedAt.getTime()) / 86_400_000))
      : 0,
    deadline: job.deadline ? job.deadline.toISOString() : null,
  }));

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const meta: IPaginationMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };

  return { jobs: items, meta };
}

// ─────────────────────────────────────────────
// GET /org/dashboard/recent-applications
// ─────────────────────────────────────────────

export async function getOrgRecentApplications(
  orgId: string,
  limit: number,
): Promise<IOrgRecentApplicant[]> {
  const applications = await prisma.application.findMany({
    where: { job: { orgId } },
    orderBy: { appliedAt: 'desc' },
    take: limit,
    include: {
      job: { select: { id: true, title: true } },
      user: {
        select: { profile: { select: { firstName: true, lastName: true, avatarUrl: true } } },
      },
    },
  });

  return applications.map((application) => ({
    id: application.id,
    applicationId: application.id,
    candidateName: application.user.profile
      ? `${application.user.profile.firstName} ${application.user.profile.lastName}`
      : 'Unknown Candidate',
    candidateAvatarUrl: application.user.profile?.avatarUrl ?? null,
    jobId: application.job.id,
    jobTitle: application.job.title,
    appliedAt: application.appliedAt.toISOString(),
  }));
}
