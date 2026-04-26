/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
// ─────────────────────────────────────────────

import { prisma } from '@config/database';
import { stripe } from '@config/stripe';
import { type Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '@utils/apiError';

import { buildPaginationMeta } from '@/utils/pagination';
import { extractPagination } from '@/utils/queryBuilder';
import { type AdminListOrgQuery } from '@/validations/admin.validation';
// sendOrgApprovedEmail will be created in the email templates phase
// import { sendOrgApprovedEmail } from '@services/email.service';

// ─────────────────────────────────────────────
// APPROVE ORGANIZATION
// ─────────────────────────────────────────────
// This is the critical path:
//   1. Validate org exists and is not already approved
//   2. Create Stripe Customer (eagerly — so it's always present before billing)
//   3. Update org: isApproved = true + stripeCustomerId in one transaction
//   4. Send approval email (TODO: wire up email template later)

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

  // TODO Phase 3G: await sendOrgApprovedEmail(org.email, org.profile?.companyName ?? 'Team');

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

// ── Response types ─────────────────────────────────────────────────────────

export interface IAdminOrgListItem {
  id: string;
  email: string;
  isApproved: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  isPaymentMethodOnFile: boolean;
  hasUnpaidIncentives: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  profile: {
    companyName: string;
    industry: string | null;
    companySize: string | null;
    location: string | null;
    country: string | null;
  } | null;
  _count: {
    jobs: number;
  };
}

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
  const { page, limit, skip } = extractPagination(query as unknown as Record<string, unknown>);

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

  const [data, total] = await Promise.all([
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

  return {
    data,
    meta: buildPaginationMeta(total, page, limit),
  };
}
