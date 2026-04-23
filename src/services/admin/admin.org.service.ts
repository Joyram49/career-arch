/* eslint-disable @typescript-eslint/no-unnecessary-condition */
// ─────────────────────────────────────────────

import { prisma } from '@config/database';
import { stripe } from '@config/stripe';
import { BadRequestError, NotFoundError } from '@utils/apiError';
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

export interface IAdminOrgListItem {
  id: string;
  email: string;
  isApproved: boolean;
  isActive: boolean;
  isPaymentMethodOnFile: boolean;
  hasUnpaidIncentives: boolean;
  createdAt: Date;
  profile: {
    companyName: string;
    industry: string | null;
    companySize: string | null;
  } | null;
}

export async function listOrganizations(filters: {
  isApproved?: boolean;
  isActive?: boolean;
  page: number;
  limit: number;
}): Promise<{ data: IAdminOrgListItem[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (filters.isApproved !== undefined) where['isApproved'] = filters.isApproved;
  if (filters.isActive !== undefined) where['isActive'] = filters.isActive;

  const skip = (filters.page - 1) * filters.limit;

  const [data, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        isApproved: true,
        isActive: true,
        isPaymentMethodOnFile: true,
        hasUnpaidIncentives: true,
        createdAt: true,
        profile: {
          select: {
            companyName: true,
            industry: true,
            companySize: true,
          },
        },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  return { data, total };
}
