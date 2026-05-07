import { handleStripeWebhook } from '@controllers/webhooks/webhook.controller';
import { asyncHandler } from '@shared/utils/asyncHandler';
import express, { Router } from 'express';

const router = Router();

/**
 * POST /webhooks/stripe
 *
 * CRITICAL: Uses express.raw() — NOT express.json().
 * Stripe requires the raw request body to verify the webhook signature.
 * This middleware is applied only to this route, before the global JSON parser.
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  asyncHandler(handleStripeWebhook),
);

export default router;
