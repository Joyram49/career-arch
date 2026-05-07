import * as SubscriptionController from '@controllers/subscription/subscription.controller';
import { authenticate } from '@shared/middlewares/authenticate';
import { authorize } from '@shared/middlewares/authorize';
import { validate } from '@shared/middlewares/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { checkoutSchema } from '@validations/subscription.validation';
import { Router } from 'express';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /subscription/plans:
 *   get:
 *     summary: List active plans (for pricing page — no auth required)
 *     tags: [Subscription]
 */
router.get('/plans', asyncHandler(SubscriptionController.getPublicPlans));

// ── Protected (USER only) ─────────────────────────────────────────────────
router.use(authenticate, authorize('USER'));

/**
 * @swagger
 * /subscription/my:
 *   get:
 *     summary: Get current user subscription + usage stats
 *     tags: [Subscription]
 */
router.get('/my', asyncHandler(SubscriptionController.getMySubscription));

/**
 * @swagger
 * /subscription/checkout:
 *   post:
 *     summary: Create a Stripe Checkout session (new subscription or upgrade)
 *     tags: [Subscription]
 */
router.post('/checkout', validate(checkoutSchema), asyncHandler(SubscriptionController.checkout));

/**
 * @swagger
 * /subscription/cancel:
 *   post:
 *     summary: Cancel subscription at period end
 *     tags: [Subscription]
 */
router.post('/cancel', asyncHandler(SubscriptionController.cancelSubscription));

/**
 * @swagger
 * /subscription/reactivate:
 *   post:
 *     summary: Undo a pending cancellation
 *     tags: [Subscription]
 */
router.post('/reactivate', asyncHandler(SubscriptionController.reactivateSubscription));

/**
 * @swagger
 * /subscription/invoices:
 *   get:
 *     summary: List past invoices from Stripe
 *     tags: [Subscription]
 */
router.get('/invoices', asyncHandler(SubscriptionController.listInvoices));

export default router;
