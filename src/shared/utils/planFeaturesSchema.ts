import { planFeaturesSchema } from '@/validations/subscription.validation';

import { BadRequestError } from './apiError';

import type { IPlanFeatures } from '@app-types/subscription.type';

export function parseFeatures(features: unknown): IPlanFeatures {
  const result = planFeaturesSchema.safeParse(features);

  if (!result.success) {
    throw new BadRequestError('Invalid plan features shape in DB');
  }
  return result.data;
}
