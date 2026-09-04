/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
// ─────────────────────────────────────────────

import { prisma } from '@config/database';
import { stripe } from '@config/stripe';
import { type AdminListOrgQuery } from '@modules/admin/validations/admin.orgs.validation';
import { type Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '@shared/utils/apiError';
import { buildPaginationMeta } from '@shared/utils/pagination';
import { extractPagination } from '@shared/utils/queryBuilder';

import { env } from '@/config/env';
import { enqueueEmail } from '@/jobs/queues/email.queue';

import { type IAdminOrgListItem } from '../types';

// ─────────────────────────────────────────────
// APPROVE ORGANIZATION
// ─────────────────────────────────────────────
// This is the critical path:
//   1. Validate org exists and is not already approved
//   2. Create Stripe Customer (eagerly — so it's always present before billing)
//   3. Update org: isApproved = true + stripeCustomerId in one transaction
//   4. Send approval email

export async function approveOrganization(orgId: string): Promise<{ message: string }> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      email: true,
      isApproved: true,
      stripeCustomerId: true,
      profile: { select: { companyName: true } },
    },
  });

  if (org === null) {
    throw new NotFoundError('Organization not found');
  }

  if (org.isApproved) {
    throw new BadRequestError('Organization is already approved');
  }

  // Create Stripe Customer if one doesn't exist yet.
  // Safe to call even if org had a partial setup before — we check first.
  let stripeCustomerId = org.stripeCustomerId;

  if (stripeCustomerId === null || stripeCustomerId === undefined) {
    const customer = await stripe.customers.create({
      email: org.email,
      name: org.profile?.companyName ?? org.email,
      metadata: {
        orgId: org.id,
        platform: 'CareerArch',
        approvedAt: new Date().toISOString(),
      },
    });

    stripeCustomerId = customer.id;
  }

  // Atomically approve + store Stripe Customer ID
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      isApproved: true,
      stripeCustomerId,
    },
  });

  // send approval email
  enqueueEmail({
    name: 'org:approved',
    to: org.email,
    companyName: org.profile?.companyName ?? 'Team',
    dashboardUrl: `${env.FRONTEND_URL}/org/dashboard`,
  });

  return {
    message: `Organization approved successfully. Stripe customer created: ${stripeCustomerId}`,
  };
}

// ─────────────────────────────────────────────
// SUSPEND ORGANIZATION
// ─────────────────────────────────────────────

export async function suspendOrganization(orgId: string): Promise<{ message: string }> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, isActive: true },
  });

  if (org === null) {
    throw new NotFoundError('Organization not found');
  }

  if (!org.isActive) {
    throw new BadRequestError('Organization is already suspended');
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: { isActive: false },
  });

  return { message: 'Organization suspended successfully.' };
}

// ─────────────────────────────────────────────
// ACTIVATE ORGANIZATION
// ─────────────────────────────────────────────

export async function activateOrganization(orgId: string): Promise<{ message: string }> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, isActive: true },
  });

  if (org === null) {
    throw new NotFoundError('Organization not found');
  }

  if (org.isActive) {
    throw new BadRequestError('Organization is already active');
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: { isActive: true },
  });

  return { message: 'Organization activated successfully.' };
}

// ─────────────────────────────────────────────
// LIST ORGANIZATIONS (with filters)
// ─────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function
export async function listOrganizations(query: AdminListOrgQuery): Promise<{
  data: IAdminOrgListItem[];
  meta: ReturnType<typeof buildPaginationMeta>;
}> {
  const {
    search,
    location,
    isActive,
    isEmailVerified,
    isApproved,
    isPaymentMethodOnFile,
    hasUnpaidIncentives,
    sortBy,
    sortOrder,
  } = query;

  // extractPagination guarantees concrete integers — never undefined or NaN.
  const { page, limit, skip } = extractPagination(query);

  // ── Where clause ──────────────────────────────────────────────────────────

  const where: Prisma.OrganizationWhereInput = {};

  // Direct boolean columns on Organization
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (isEmailVerified !== undefined) {
    where.isEmailVerified = isEmailVerified;
  }

  if (isApproved !== undefined) {
    where.isApproved = isApproved;
  }

  // isPaymentMethodOnFile — direct boolean column on Organization
  if (isPaymentMethodOnFile !== undefined) {
    where.isPaymentMethodOnFile = isPaymentMethodOnFile;
  }

  // hasUnpaidIncentives — direct boolean column on Organization.
  // Kept in sync by a webhook/service when incentive statuses change.
  if (hasUnpaidIncentives !== undefined) {
    where.hasUnpaidIncentives = hasUnpaidIncentives;
  }

  // location filter — matches profile.location OR profile.country
  // e.g. ?location=Bangladesh returns orgs in Dhaka AND orgs whose country is Bangladesh
  if (location !== undefined && location.length > 0) {
    where.profile = {
      OR: [
        { location: { contains: location, mode: 'insensitive' } },
        { country: { contains: location, mode: 'insensitive' } },
      ],
    };
  }

  // keyword search — email + companyName + location + country
  // If both search and location are provided, we merge them under AND so
  // Prisma does not overwrite the profile filter set above.
  if (search !== undefined && search.length > 0) {
    const searchConditions: Prisma.OrganizationWhereInput = {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { companyName: { contains: search, mode: 'insensitive' } } },
        { profile: { location: { contains: search, mode: 'insensitive' } } },
        { profile: { country: { contains: search, mode: 'insensitive' } } },
      ],
    };

    // Merge with existing where using AND so neither filter overwrites the other
    where.AND = [searchConditions];
  }

  // ── Order by ──────────────────────────────────────────────────────────────
  // companySize is a categorical enum string ('1-10', '11-50', etc.) —
  // alphabetic ordering is meaningless, so it is intentionally excluded from
  // sortBy options. foundedYear is an Int and sorts correctly.

  const direction: Prisma.SortOrder = sortOrder ?? 'desc';

  const orderBy: Prisma.OrganizationOrderByWithRelationInput =
    sortBy === 'email'
      ? { email: direction }
      : sortBy === 'lastLoginAt'
        ? { lastLoginAt: direction }
        : sortBy === 'foundedYear'
          ? { profile: { foundedYear: direction } }
          : { createdAt: direction }; // default

  const [rows, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isPaymentMethodOnFile: true,
        hasUnpaidIncentives: true,
        lastLoginAt: true,
        createdAt: true,
        profile: {
          select: {
            companyName: true,
            industry: true,
            companySize: true,
            location: true,
            country: true,
          },
        },
        _count: {
          select: { jobs: true },
        },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  // ── Enrich page with hired-count + unpaid-incentive aggregates ────────────
  // Neither of these can be expressed as a nested Prisma `_count`/`select` on
  // Organization directly (hires require crossing the Job → Application
  // relation; incentives live on a sibling table), so we batch-load them in
  // two extra queries scoped to just the org IDs on this page — never per-row.

  const orgIds = rows.map((row) => row.id);

  const [hiredApplications, incentiveAgg] =
    orgIds.length > 0
      ? await Promise.all([
          prisma.application.findMany({
            where: { status: 'HIRED', job: { orgId: { in: orgIds } } },
            select: { job: { select: { orgId: true } } },
          }),
          prisma.hiringIncentive.groupBy({
            by: ['orgId'],
            where: {
              orgId: { in: orgIds },
              status: { in: ['PENDING', 'OVERDUE', 'DISPUTED'] },
            },
            _sum: { amount: true },
            _count: { id: true },
          }),
        ])
      : [[], []];

  const hiredCountByOrg = new Map<string, number>();
  for (const application of hiredApplications) {
    const { orgId } = application.job;
    hiredCountByOrg.set(orgId, (hiredCountByOrg.get(orgId) ?? 0) + 1);
  }

  const incentivesByOrg = new Map<string, { unpaidAmountCents: number; unpaidCount: number }>();
  for (const row of incentiveAgg) {
    incentivesByOrg.set(row.orgId, {
      unpaidAmountCents: Math.round((row._sum.amount ?? 0) * 100),
      unpaidCount: row._count.id,
    });
  }

  const data: IAdminOrgListItem[] = rows.map((row) => ({
    ...row,
    hiredCount: hiredCountByOrg.get(row.id) ?? 0,
    incentives: incentivesByOrg.get(row.id) ?? { unpaidAmountCents: 0, unpaidCount: 0 },
  }));

  return {
    data,
    meta: buildPaginationMeta(total, page, limit),
  };
}
