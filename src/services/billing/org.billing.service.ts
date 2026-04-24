/* eslint-disable @typescript-eslint/no-unnecessary-condition */
// ─────────────────────────────────────────────
// GET BILLING INFO
// ─────────────────────────────────────────────

import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { stripe } from '@/config/stripe';
import { BadRequestError, NotFoundError } from '@/utils/apiError';

export interface IBillingInfo {
  isPaymentMethodOnFile: boolean;
  hasUnpaidIncentives: boolean;
  card: {
    brand: string;
    last4: string;
    expMonth: string;
    expYear: string;
  } | null;
}

export async function getOrgBillingInfo(orgId: string): Promise<IBillingInfo> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      stripeCustomerId: true,
      stripeDefaultPaymentMethodId: true,
      isPaymentMethodOnFile: true,
      hasUnpaidIncentives: true,
    },
  });

  if (org === null) {
    throw new NotFoundError('Organization not found');
  }

  // No payment method saved yet
  if (org.stripeDefaultPaymentMethodId === null || org.stripeDefaultPaymentMethodId === undefined) {
    return {
      isPaymentMethodOnFile: false,
      hasUnpaidIncentives: org.hasUnpaidIncentives,
      card: null,
    };
  }

  // Fetch the saved card details from Stripe (so we can show last4 / brand to the org)

  try {
    const pm = await stripe.paymentMethods.retrieve(org.stripeDefaultPaymentMethodId);
    const card = pm.card;
    return {
      isPaymentMethodOnFile: org.isPaymentMethodOnFile,
      hasUnpaidIncentives: org.hasUnpaidIncentives,
      card:
        card !== undefined && card !== null
          ? {
              brand: card.brand,
              last4: card.last4,
              expMonth: String(card.exp_month),
              expYear: String(card.exp_year),
            }
          : null,
    };
  } catch {
    // Stripe retrieval failed — treat as no card on file
    return {
      isPaymentMethodOnFile: false,
      hasUnpaidIncentives: org.hasUnpaidIncentives,
      card: null,
    };
  }
}

// ─────────────────────────────────────────────
// CREATE SETUP INTENT
// ─────────────────────────────────────────────
// Called when the org wants to add/replace their payment method.
// Returns a clientSecret that the frontend passes to Stripe.js to
// render the card form. No actual charge happens here.

export interface ISetupIntentResponse {
  clientSecret: string;
  customerId: string;
}

export async function createSetUpIntent(orgId: string): Promise<ISetupIntentResponse> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      email: true,
      stripeCustomerId: true,
      isApproved: true,
      profile: { select: { companyName: true } },
    },
  });

  if (org === null) {
    throw new NotFoundError('Organization not found');
  }

  if (!org.isApproved) {
    throw new BadRequestError('Your organization must be approved before adding a payment method.');
  }

  // Ensure Stripe customer exists — create lazily if not yet created.
  // (Admin approval is the primary trigger for customer creation, but this
  //  is a safe fallback in case the approval flow didn't create one.)
  let customerId = org.stripeCustomerId;

  if (customerId === null || customerId === undefined) {
    const customer = await stripe.customers.create({
      email: org.email,
      name: org.profile?.companyName ?? org.email,
      metadata: {
        orgId: org.id,
        platform: 'CareerArch',
      },
    });

    customerId = customer.id;
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  // Create SetupIntent — this tells Stripe we want to save a card for later
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session', // critical: allows us to charge later without the org being present
    metadata: {
      orgId,
      platform: 'CareerArch',
    },
  });

  if (setupIntent.client_secret === null || setupIntent.client_secret === undefined) {
    throw new BadRequestError('Failed to create payment setup session. Please try again.');
  }

  return {
    clientSecret: setupIntent.client_secret,
    customerId,
  };
}

// ─────────────────────────────────────────────
// SAVE PAYMENT METHOD
// ─────────────────────────────────────────────
// Called after the frontend confirms the SetupIntent via Stripe.js.
// The paymentMethodId (pm_xxx) is now attached to the Stripe Customer.
// We store it as the default and mark the org as billing-ready.

export async function savePaymentMethod(
  orgId: string,
  paymentMethodId: string,
): Promise<IBillingInfo> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      stripeCustomerId: true,
      isApproved: true,
    },
  });

  if (org === null) {
    throw new NotFoundError('Organization not found');
  }

  if (!org.isApproved) {
    throw new BadRequestError('your orgainzation must be approved before adding a payment method.');
  }
  if (org.stripeCustomerId === null || org.stripeCustomerId === undefined) {
    throw new BadRequestError('No Stripe customer found. Please contact support.');
  }

  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== org.stripeCustomerId) {
    throw new BadRequestError('Invalid payment method. Pelase try again.');
  }

  if (pm.type !== 'card' || pm.card === undefined || pm.card === null) {
    throw new BadRequestError('Only card payment methods are supported.');
  }

  // Set as default on the Stripe Customer object
  await stripe.customers.update(org.stripeCustomerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  // Persist to our DB
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      stripeDefaultPaymentMethodId: paymentMethodId,
      isPaymentMethodOnFile: true,
    },
  });

  return {
    isPaymentMethodOnFile: true,
    hasUnpaidIncentives: false,
    card: {
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: String(pm.card.exp_month),
      expYear: String(pm.card.exp_year),
    },
  };
}

// ─────────────────────────────────────────────
// REMOVE PAYMENT METHOD
// ─────────────────────────────────────────────
// Orgs can remove their card only if they have no PENDING/OVERDUE incentives.

export async function removePaymentMethod(orgId: string): Promise<{ message: string }> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      stripeCustomerId: true,
      stripeDefaultPaymentMethodId: true,
      hasUnpaidIncentives: true,
    },
  });

  if (org === null) {
    throw new NotFoundError('Organization not found');
  }

  if (org.hasUnpaidIncentives) {
    throw new BadRequestError(
      'You cannot remove your payment method while you have outstanding incentive payments.',
    );
  }

  // Detach from Stripe if we have a reference
  if (org.stripeDefaultPaymentMethodId !== null && org.stripeDefaultPaymentMethodId !== undefined) {
    try {
      await stripe.paymentMethods.detach(org.stripeDefaultPaymentMethodId);
    } catch (error) {
      logger.info('error while detacth payment method: ', error);
    }
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      stripeDefaultPaymentMethodId: null,
      isPaymentMethodOnFile: false,
    },
  });
  return { message: 'Payment method removed successfully' };
}

// ─────────────────────────────────────────────
// CREATE PAYMENT METHOD (TEST CASE AFTER FRONTEND PART THIS WILL REMOVE)
// ─────────────────────────────────────────────
// Orgs can remove their card only if they have no PENDING/OVERDUE incentives.

export async function createPaymentMethod(
  customerId: string,
): Promise<{ paymentMethodId: string }> {
  if (customerId === null || customerId === undefined) {
    throw new BadRequestError('Customer id is required');
  }

  // 1. Create PaymentMethod (test card)
  const paymentMethod = await stripe.paymentMethods.create({
    type: 'card',
    card: {
      token: 'tok_visa',
    },
  });

  // 2. Attach to customer
  await stripe.paymentMethods.attach(paymentMethod.id, {
    customer: customerId,
  });

  // 3. (Optional) Set as default payment method
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethod.id,
    },
  });

  return {
    paymentMethodId: paymentMethod.id,
  };
}
