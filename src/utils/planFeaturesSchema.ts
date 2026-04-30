import type { IPlanFeatures } from '@/types/subscription';
import { planFeaturesSchema } from '@/validations/subscription.validation';

import { BadRequestError } from './apiError';

export function parseFeatures(features: unknown): IPlanFeatures {
  const result = planFeaturesSchema.safeParse(features);

  if (!result.success) {
    throw new BadRequestError('Invalid plan features shape in DB');
  }
  return result.data;
}
