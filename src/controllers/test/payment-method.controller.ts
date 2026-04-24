import * as OrgBillingService from '@/services/billing/org.billing.service';
import { sendSuccess } from '@/utils/apiResponse';
import { type CreatePaymentMethodInput } from '@/validations/org.validation';

import type { Request, Response } from 'express';

export async function createPaymentMethod(req: Request, res: Response): Promise<Response> {
  const { customerId } = req.body as CreatePaymentMethodInput;
  const result = await OrgBillingService.createPaymentMethod(customerId);
  return sendSuccess(
    res,
    result,
    'Setup intent created. Use the clientSecret with Stripe.js to complete card setup.',
  );
}
