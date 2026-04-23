import * as OrgBillingService from '@/services/billing/org.billing.service';
import { type IAuthenticatedRequest } from '@/types';
import { sendSuccess } from '@/utils/apiResponse';
import { type SavePaymentMethodInput } from '@/validations/org.validation';

// ── GET /org/billing ───────────────────────────────────────────────────────
export async function getBillingInfo(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const billing = await OrgBillingService.getOrgBillingInfo(sub);
  return sendSuccess(res, { billing }, 'Billing information retrieved');
}

// ── POST /org/billing/setup-intent ────────────────────────────────────────
// Step 1 of card setup: create a Stripe SetupIntent and return clientSecret
// to the frontend so it can render the Stripe card element.
export async function createSetUpIntent(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const result = await OrgBillingService.createSetUpIntent(sub);
  return sendSuccess(
    res,
    result,
    'Setup intent created. Use the clientSecret with Stripe.js to complete card setup.',
  );
}

// ── POST /org/billing/payment-method ─────────────────────────────────────
// Step 2 of card setup: after Stripe.js confirms the SetupIntent,
// frontend sends us the paymentMethodId to persist as default.
export async function savePaymentMethod(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const { paymentMethodId } = req.body as SavePaymentMethodInput;
  const billing = await OrgBillingService.savePaymentMethod(sub, paymentMethodId);
  return sendSuccess(res, { billing }, 'Payment method saved successfully.');
}

// ── DELETE /org/billing/payment-method ───────────────────────────────────
export async function removePaymentMethod(req: Request, res: Response): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const result = await OrgBillingService.removePaymentMethod(sub);
  return sendSuccess(res, null, result.message);
}
