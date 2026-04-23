import * as OrgBillingController from '@controllers/org/org.billing.controller';
import * as OrgProfileController from '@controllers/org/org.profile.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { validate } from '@middlewares/validate';
import { asyncHandler } from '@utils/asyncHandler';
import { savePaymentMethodSchema, updateOrgProfileSchema } from '@validations/org.validation';
import { Router } from 'express';

const router = Router();

// All org routes require a valid ORGANIZATION token
router.use(authenticate, authorize('ORGANIZATION'));

// ─────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────

/**
 * @swagger
 * /org/profile:
 *   get:
 *     summary: Get organization profile
 *     tags: [Organization]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/profile', asyncHandler(OrgProfileController.getProfile));

/**
 * @swagger
 * /org/profile:
 *   put:
 *     summary: Update organization profile
 *     tags: [Organization]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *               website:
 *                 type: string
 *                 format: uri
 *               industry:
 *                 type: string
 *               companySize:
 *                 type: string
 *               foundedYear:
 *                 type: integer
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               country:
 *                 type: string
 *               linkedinUrl:
 *                 type: string
 *               twitterUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put(
  '/profile',
  validate(updateOrgProfileSchema),
  asyncHandler(OrgProfileController.updateProfile),
);

// ─────────────────────────────────────────────
// BILLING
// ─────────────────────────────────────────────

/**
 * @swagger
 * /org/billing:
 *   get:
 *     summary: Get billing info (card on file, payment status)
 *     tags: [Organization]
 *     security:
 *       - BearerAuth: []
 */
router.get('/billing', asyncHandler(OrgBillingController.getBillingInfo));

/**
 * @swagger
 * /org/billing/setup-intent:
 *   post:
 *     summary: Create a Stripe SetupIntent to begin card setup flow
 *     tags: [Organization]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Returns a clientSecret. Pass this to Stripe.js on the frontend
 *       to render the card form. The org must be approved before calling this.
 */
router.post('/billing/setup-intent', asyncHandler(OrgBillingController.createSetUpIntent));

/**
 * @swagger
 * /org/billing/payment-method:
 *   post:
 *     summary: Save confirmed payment method after Stripe.js SetupIntent confirmation
 *     tags: [Organization]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentMethodId]
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *                 example: pm_1234567890
 */
router.post(
  '/billing/payment-method',
  validate(savePaymentMethodSchema),
  asyncHandler(OrgBillingController.savePaymentMethod),
);

/**
 * @swagger
 * /org/billing/payment-method:
 *   delete:
 *     summary: Remove saved payment method (only if no outstanding incentives)
 *     tags: [Organization]
 *     security:
 *       - BearerAuth: []
 */
router.delete('/billing/payment-method', asyncHandler(OrgBillingController.removePaymentMethod));

export default router;
