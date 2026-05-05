import {
  applicationAnswersSchema,
  type ApplicationAnswersInput,
} from '@/validations/application.validation';

import { BadRequestError } from './apiError';

export function parseApplicationAnswers(answers: unknown): ApplicationAnswersInput {
  const result = applicationAnswersSchema.safeParse(answers);

  if (!result.success) {
    throw new BadRequestError(`Invalid application answers format: ${result.error.message}`);
  }

  return result.data;
}
