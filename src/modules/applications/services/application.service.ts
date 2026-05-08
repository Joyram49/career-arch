import { prisma } from '@config/database';
import { env } from '@config/env';
import {
  emitNewApplication,
  emitNotification,
  emitStatusUpdated,
  emitWithdrawn,
} from '@config/socket';
import { enqueueEmail } from '@jobs/queues/email.queue';
import { BadRequestError, ConflictError, NotFoundError } from '@shared/utils/apiError';
import { buildPaginationMeta } from '@shared/utils/pagination';
import { extractPagination } from '@shared/utils/queryBuilder';

import { createIncentiveForHire } from '@/modules/incentives/services/incentive.service';

import { STATUS_NOTIFICATION, validateTransition } from '../helpers';

import type {
  CreateApplicationInput,
  ListJobApplicationsQuery,
  ListOrgApplicationsQuery,
  ListUserApplicationsQuery,
  UpdateApplicationStatusInput,
} from '@modules/applications/validations/application.validation';
import type { Prisma } from '@prisma/client';

// ─────────────────────────────────────────────
// CREATE APPLICATION
// ─────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function
export async function createApplication(
  userId: string,
  data: CreateApplicationInput,
): Promise<object> {
  // 1. Load job with org info (job existence + status already checked by checkJobPlan middleware)
  const job = await prisma.job.findUnique({
    where: { id: data.jobId },
    include: {
      organization: {
        select: {
          id: true,
          email: true,
          profile: { select: { companyName: true } },
        },
      },
    },
  });

  if (job === null) throw new NotFoundError('Job not found');

  // 2. Load user profile for resume fallback + email data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        select: { firstName: true, lastName: true, resumeUrl: true },
      },
    },
  });

  if (user === null) throw new NotFoundError('User not found');

  // 3. Duplicate apply guard
  const existing = await prisma.application.findUnique({
    where: { jobId_userId: { jobId: data.jobId, userId } },
    select: { id: true },
  });

  if (existing !== null) {
    throw new ConflictError('You have already applied to this job');
  }

  // 4. Resolve resumeUrl: request override → profile resume → null
  const resolvedResumeUrl = data.resumeUrl ?? user.profile?.resumeUrl ?? null;

  const applicationData: Prisma.ApplicationCreateInput = {
    job: { connect: { id: data.jobId } },
    user: { connect: { id: userId } },
    status: 'PENDING',
    coverLetter: data.coverLetter ?? null,
    resumeUrl: resolvedResumeUrl,
  };

  // only add answers if exists
  if (data.answers !== undefined) {
    applicationData.answers = data.answers;
  }

  // 5. Create application
  const application = await prisma.application.create({
    data: applicationData,
  });

  // 6. Increment monthly apply counter
  await prisma.subscription.update({
    where: { userId },
    data: { applyCountThisMonth: { increment: 1 } },
  });

  // 7. Prepare shared data for notifications/emails
  const companyName = job.organization.profile?.companyName ?? 'From Unknown';
  const candidateName = `${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim();
  const dashboardUrl = `${env.FRONTEND_URL}/dashboard/user/applications`;
  const applicationUrl = `${env.FRONTEND_URL}/org/applications/${application.id}`;

  // 8. Emit real-time event to org
  emitNewApplication(job.organization.id, {
    applicationId: application.id,
    jobTitle: job.title,
    candidateName,
    appliedAt: application.appliedAt,
  });

  // 9. Create in-DB notification for org
  const orgNotification = await prisma.notification.create({
    data: {
      orgId: job.organization.id,
      recipientRole: 'ORGANIZATION',
      title: 'New Application Received',
      message: `${candidateName} applied for ${job.title}`,
      link: `/org/applications/${application.id}`,
    },
  });

  // 10. Emit notification badge to org
  emitNotification(job.organization.id, {
    id: orgNotification.id,
    title: orgNotification.title,
    message: orgNotification.message,
    link: orgNotification.link,
  });

  // 11. Enqueue emails (fire-and-forget — never blocks response)
  const appliedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  enqueueEmail({
    name: 'application:submitted-user',
    to: user.email,
    firstName: user.profile?.firstName ?? 'User',
    jobTitle: job.title,
    companyName,
    appliedDate,
    dashboardUrl,
  });

  enqueueEmail({
    name: 'application:submitted-org',
    to: job.organization.email,
    companyName,
    candidateName,
    jobTitle: job.title,
    appliedDate,
    applicationUrl,
  });

  return application;
}

// ─────────────────────────────────────────────
// WITHDRAW APPLICATION
// ─────────────────────────────────────────────

export async function withdrawApplication(
  userId: string,
  applicationId: string,
): Promise<{ message: string }> {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: {
      job: {
        select: {
          title: true,
          orgId: true,
        },
      },
      user: {
        include: { profile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  if (application === null) throw new NotFoundError('Application not found');

  // Guard: only PENDING and UNDER_REVIEW can be withdrawn by user
  if (!['PENDING', 'UNDER_REVIEW'].includes(application.status)) {
    throw new BadRequestError(
      'You can only withdraw an application that is pending or under review. ' +
        'Once shortlisted, withdrawal is not permitted.',
    );
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: { status: 'WITHDRAWN' },
  });

  const candidateName =
    `${application.user.profile?.firstName ?? ''} ${application.user.profile?.lastName ?? ''}`.trim();

  // Notify org
  emitWithdrawn(application.job.orgId, {
    applicationId,
    jobTitle: application.job.title,
    candidateName,
  });

  return { message: 'Application withdrawn successfully' };
}

// ─────────────────────────────────────────────
// UPDATE APPLICATION STATUS  (Org action)
// ─────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function
export async function updateApplicationStatus(
  orgId: string,
  applicationId: string,
  data: UpdateApplicationStatusInput,
): Promise<object> {
  // Find application, verify it belongs to a job owned by this org
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      job: { orgId },
    },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          orgId: true,
          organization: {
            select: {
              profile: { select: { companyName: true } },
            },
          },
        },
      },
      user: {
        include: {
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (application === null) throw new NotFoundError('Application not found');

  // Guard: cannot update terminal or withdrawn applications
  if (application.status === 'WITHDRAWN') {
    throw new BadRequestError('Cannot update a withdrawn application');
  }

  // Validate status transition
  validateTransition(application.status, data.status);

  const prevStatus = application.status;
  const companyName = application.job.organization.profile?.companyName ?? 'Unknown company';
  const firstName = application.user.profile?.firstName ?? 'User';
  const candidateName =
    `${application.user.profile?.firstName ?? ''} ${application.user.profile?.lastName ?? ''}`.trim();

  // Update application
  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: data.status,
      notes: data.notes ?? application.notes,
      emailSentToUser: false, // reset — will send fresh email below
    },
  });

  // Create in-DB notification for user
  const notifyConfig = STATUS_NOTIFICATION[data.status];
  if (notifyConfig !== undefined) {
    const notification = await prisma.notification.create({
      data: {
        userId: application.userId,
        recipientRole: 'USER',
        title: notifyConfig.title,
        message: notifyConfig.message(application.job.title, companyName),
        link: `/dashboard/user/applications/${applicationId}`,
      },
    });

    // Emit real-time notification badge
    emitNotification(application.userId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      link: notification.link,
    });
  }

  // Emit real-time status update to user
  emitStatusUpdated(application.userId, {
    applicationId,
    jobId: application.job.id,
    jobTitle: application.job.title,
    oldStatus: prevStatus,
    newStatus: data.status,
    updatedAt: updated.updatedAt,
  });

  enqueueEmail({
    name: 'application:status-update',
    to: application.user.email,
    firstName,
    jobTitle: application.job.title,
    companyName,
    status: data.status,
    dashboardUrl: `${env.FRONTEND_URL}/dashboard/user/applications`,
  });

  // If HIRED → create hiring incentive
  if (data.status === 'HIRED') {
    await createIncentiveForHire(
      orgId,
      application.job.id,
      applicationId,
      candidateName,
      application.job.title,
    );
  }

  return updated;
}

// ─────────────────────────────────────────────
// LIST USER'S OWN APPLICATIONS
// ─────────────────────────────────────────────

export async function listUserApplications(
  userId: string,
  query: ListUserApplicationsQuery,
): Promise<{ data: object[]; meta: ReturnType<typeof buildPaginationMeta> }> {
  const { status, sortBy, sortOrder } = query;
  const { page, limit, skip } = extractPagination(query);

  const where: Prisma.ApplicationWhereInput = {
    userId,
    ...(status !== undefined && { status }),
  };

  const orderBy: Prisma.ApplicationOrderByWithRelationInput =
    sortBy === 'updatedAt' ? { updatedAt: sortOrder } : { appliedAt: sortOrder };

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        status: true,
        coverLetter: true,
        resumeUrl: true,
        appliedAt: true,
        updatedAt: true,
        job: {
          select: {
            id: true,
            title: true,
            slug: true,
            location: true,
            isRemote: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
            jobType: true,
            requiredPlan: true,
            organization: {
              select: {
                profile: {
                  select: { companyName: true, logoUrl: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.application.count({ where }),
  ]);

  return {
    data: applications,
    meta: buildPaginationMeta(total, page, limit),
  };
}

// ─────────────────────────────────────────────
// GET SINGLE USER APPLICATION DETAIL
// ─────────────────────────────────────────────

export async function getUserApplication(userId: string, applicationId: string): Promise<object> {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: {
      job: {
        include: {
          organization: {
            select: {
              profile: { select: { companyName: true, logoUrl: true, website: true } },
            },
          },
        },
      },
    },
  });

  if (application === null) throw new NotFoundError('Application not found');

  return application;
}

// ─────────────────────────────────────────────
// LIST ORG APPLICATIONS (across all jobs)
// ─────────────────────────────────────────────

export async function listOrgApplications(
  orgId: string,
  query: ListOrgApplicationsQuery,
): Promise<{ data: object[]; meta: ReturnType<typeof buildPaginationMeta> }> {
  const { status, jobId, sortBy, sortOrder } = query;
  const { page, limit, skip } = extractPagination(query);

  const where: Prisma.ApplicationWhereInput = {
    job: { orgId },
    ...(status !== undefined && { status }),
    ...(jobId !== undefined && { jobId }),
  };

  const orderBy: Prisma.ApplicationOrderByWithRelationInput =
    sortBy === 'updatedAt' ? { updatedAt: sortOrder } : { appliedAt: sortOrder };

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        job: { select: { id: true, title: true, slug: true } },
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
                headline: true,
                location: true,
                experienceYears: true,
                skills: true,
              },
            },
          },
        },
      },
    }),
    prisma.application.count({ where }),
  ]);

  return {
    data: applications,
    meta: buildPaginationMeta(total, page, limit),
  };
}

// ─────────────────────────────────────────────
// LIST APPLICATIONS FOR A SPECIFIC JOB
// ─────────────────────────────────────────────

export async function listJobApplications(
  orgId: string,
  jobId: string,
  query: ListJobApplicationsQuery,
): Promise<{ data: object[]; meta: object }> {
  // Verify job belongs to org
  const job = await prisma.job.findFirst({
    where: { id: jobId, orgId },
    select: { id: true },
  });

  if (job === null) throw new NotFoundError('Job not found');

  return listOrgApplications(orgId, { ...query, jobId });
}

// ─────────────────────────────────────────────
// GET SINGLE ORG APPLICATION DETAIL
// ─────────────────────────────────────────────

export async function getOrgApplication(orgId: string, applicationId: string): Promise<object> {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      job: { orgId },
    },
    include: {
      job: { select: { id: true, title: true, slug: true, orgId: true } },
      user: {
        select: {
          id: true,
          email: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
              resumeUrl: true,
              headline: true,
              summary: true,
              location: true,
              linkedinUrl: true,
              githubUrl: true,
              portfolioUrl: true,
              skills: true,
              experienceYears: true,
              phone: true,
            },
          },
        },
      },
    },
  });

  if (application === null) throw new NotFoundError('Application not found');

  return application;
}
