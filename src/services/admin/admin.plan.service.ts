import { prisma } from '@config/database';
import { stripe } from '@config/stripe';
import { BadRequestError, ConflictError, NotFoundError } from '@utils/apiError';
import { type CreatePlanInput, type UpdatePlanInput } from '@validations/subscription.validation';

import { parseFeatures } from '@/utils/planFeaturesSchema';

import type { IPlanCatalogueResponse, IPlanFeatures } from '@app-types/subscription';
import type { SubscriptionPlan } from '@prisma/client';

// ─────────────────────────────────────────────
// LIST ALL PLANS (admin — includes inactive)
// ─────────────────────────────────────────────

export async function listAllPlans(): Promise<IPlanCatalogueResponse[]> {
  const plans = await prisma.planCatalogue.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  return plans.map(mapPlanToResponse);
}

// ─────────────────────────────────────────────
// GET SINGLE PLAN
// ─────────────────────────────────────────────

export async function getPlanById(id: string): Promise<IPlanCatalogueResponse> {
  const plan = await prisma.planCatalogue.findUnique({ where: { id } });
  if (plan === null) throw new NotFoundError('Plan not found');
  return mapPlanToResponse(plan);
}

// ─────────────────────────────────────────────
// CREATE PLAN  (BASIC or PREMIUM only)
// Creates Stripe Product + Price, stores IDs in DB
// ─────────────────────────────────────────────

export async function createPlan(data: CreatePlanInput): Promise<IPlanCatalogueResponse> {
  // Guard: FREE is seeded and immutable
  if (data.key === ('FREE' as SubscriptionPlan)) {
    throw new BadRequestError('The FREE plan is managed by the system and cannot be recreated');
  }

  // Guard: plan key must be unique
  const existing = await prisma.planCatalogue.findUnique({
    where: { key: data.key },
    select: { id: true, stripePriceId: true },
  });

  if (existing !== null && existing.stripePriceId !== null) {
    throw new ConflictError(`A ${data.key} plan already exists and is connected to Stripe.`);
  }

  // 1. Create Stripe Product
  const stripeProduct = await stripe.products.create({
    name: data.displayName,
    description: data.description ?? '',
    metadata: { plan: data.key, platform: 'CareerArch' },
  });

  // 2. Create Stripe Price (monthly recurring)
  const stripePrice = await stripe.prices.create({
    product: stripeProduct.id,
    currency: 'usd',
    unit_amount: data.monthlyPriceCents,
    recurring: { interval: 'month' },
    metadata: { plan: data.key },
  });

  // 3. Upsert PlanCatalogue row (handles the case where row exists but has no Stripe IDs)
  const plan = await prisma.planCatalogue.upsert({
    where: { key: data.key },
    update: {
      displayName: data.displayName,
      description: data.description ?? null,
      monthlyPriceCents: data.monthlyPriceCents,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
      features: data.features,
      isActive: true,
    },
    create: {
      key: data.key,
      displayName: data.displayName,
      description: data.description ?? null,
      monthlyPriceCents: data.monthlyPriceCents,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
      features: data.features,
      isActive: true,
      sortOrder: data.key === 'BASIC' ? 1 : 2,
    },
  });

  return mapPlanToResponse(plan);
}

// ─────────────────────────────────────────────
// UPDATE PLAN
// If price changes → archive old Stripe Price, create new one
// If only metadata changes → update Stripe Product only
// ─────────────────────────────────────────────

export async function updatePlan(
  id: string,
  data: UpdatePlanInput,
): Promise<IPlanCatalogueResponse> {
  const plan = await prisma.planCatalogue.findUnique({ where: { id } });
  if (plan === null) throw new NotFoundError('Plan not found');

  // Guard: FREE price cannot be changed
  if (plan.key === 'FREE' && data.monthlyPriceCents !== undefined && data.monthlyPriceCents !== 0) {
    throw new BadRequestError('The FREE plan price cannot be changed');
  }

  let newStripePriceId = plan.stripePriceId;

  // ── Price changed on a paid plan → create new Stripe Price ───────────────
  const priceChanged =
    data.monthlyPriceCents !== undefined &&
    data.monthlyPriceCents !== plan.monthlyPriceCents &&
    plan.key !== 'FREE';

  if (priceChanged && plan.stripeProductId !== null) {
    // Archive old price
    if (plan.stripePriceId !== null) {
      await stripe.prices.update(plan.stripePriceId, { active: false });
    }

    // Create new price
    const newStripePrice = await stripe.prices.create({
      product: plan.stripeProductId,
      currency: 'usd',
      unit_amount: data.monthlyPriceCents ?? 0,
      recurring: { interval: 'month' },
      metadata: { plan: plan.key, platform: 'CareerArch' },
    });

    newStripePriceId = newStripePrice.id;
  }

  // ── Update Stripe Product metadata / name if changed ─────────────────────
  if (
    plan.stripeProductId !== null &&
    (data.displayName !== undefined || data.description !== undefined)
  ) {
    await stripe.products.update(plan.stripeProductId, {
      ...(data.displayName !== undefined && { name: data.displayName }),
      ...(data.description !== undefined && { description: data.description ?? '' }),
    });
  }

  // ── Merge features ────────────────────────────────────────────────────────
  const currentFeatures = parseFeatures(plan.features);
  const mergedFeatures =
    data.features !== undefined ? { ...currentFeatures, ...data.features } : currentFeatures;

  // ── Update DB ─────────────────────────────────────────────────────────────
  const updated = await prisma.planCatalogue.update({
    where: { id },
    data: {
      ...(data.displayName !== undefined && { displayName: data.displayName }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.monthlyPriceCents !== undefined && { monthlyPriceCents: data.monthlyPriceCents }),
      ...(priceChanged && { stripePriceId: newStripePriceId }),
      features: mergedFeatures,
    },
  });

  return mapPlanToResponse(updated);
}

// ─────────────────────────────────────────────
// TOGGLE ACTIVE
// ─────────────────────────────────────────────

export async function togglePlanActive(id: string): Promise<IPlanCatalogueResponse> {
  const plan = await prisma.planCatalogue.findUnique({ where: { id } });
  if (plan === null) throw new NotFoundError('Plan not found');

  if (plan.key === 'FREE') {
    throw new BadRequestError('The FREE plan cannot be deactivated');
  }

  const updated = await prisma.planCatalogue.update({
    where: { id },
    data: { isActive: !plan.isActive },
  });

  return mapPlanToResponse(updated);
}

// ─────────────────────────────────────────────
// DELETE PLAN (soft — marks inactive, archives Stripe)
// Guards against active subscribers
// ─────────────────────────────────────────────

export async function deletePlan(id: string): Promise<{ message: string }> {
  const plan = await prisma.planCatalogue.findUnique({ where: { id } });
  if (plan === null) throw new NotFoundError('Plan not found');

  if (plan.key === 'FREE') {
    throw new BadRequestError('The FREE plan is system-managed and cannot be deleted');
  }

  // Guard: cannot delete if active subscribers exist
  const activeCount = await prisma.subscription.count({
    where: { plan: plan.key, status: 'ACTIVE' },
  });

  if (activeCount > 0) {
    throw new ConflictError(
      `Cannot delete the ${plan.displayName} plan — ${activeCount} active subscriber(s) exist. Deactivate it instead.`,
    );
  }

  // Archive on Stripe
  if (plan.stripeProductId !== null) {
    if (plan.stripePriceId !== null) {
      await stripe.prices.update(plan.stripePriceId, { active: false });
    }
    await stripe.products.update(plan.stripeProductId, { active: false });
  }

  // Soft delete in DB
  await prisma.planCatalogue.update({
    where: { id },
    data: {
      isActive: false,
      stripePriceId: null,
      stripeProductId: null,
    },
  });

  return { message: `${plan.displayName} plan deleted successfully` };
}

// ─────────────────────────────────────────────
// HELPER — LOAD PLAN FEATURES (used by middlewares)
// ─────────────────────────────────────────────

export async function getPlanFeatures(plan: SubscriptionPlan): Promise<IPlanFeatures> {
  const catalogue = await prisma.planCatalogue.findUnique({
    where: { key: plan },
    select: { features: true },
  });

  if (catalogue === null) {
    // Fallback to FREE limits if catalogue row somehow missing
    return {
      jobBrowseLimit: 20,
      applyMonthlyLimit: 5,
      saveJobsLimit: 5,
      canViewOrgProfile: false,
      resumeVersions: 1,
      canDownloadHistory: false,
      earlyJobAlerts: false,
      prioritySearch: false,
      aiResumeTips: false,
      badge: null,
    };
  }

  return parseFeatures(catalogue.features);
}

// ─────────────────────────────────────────────
// INTERNAL MAPPER
// ─────────────────────────────────────────────

function mapPlanToResponse(plan: {
  id: string;
  key: SubscriptionPlan;
  displayName: string;
  description: string | null;
  monthlyPriceCents: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
  isActive: boolean;
  sortOrder: number;
  features: unknown;
  createdAt: Date;
  updatedAt: Date;
}): IPlanCatalogueResponse {
  return {
    id: plan.id,
    key: plan.key,
    displayName: plan.displayName,
    description: plan.description,
    monthlyPriceCents: plan.monthlyPriceCents,
    stripeProductId: plan.stripeProductId,
    stripePriceId: plan.stripePriceId,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
    features: parseFeatures(plan.features),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}
