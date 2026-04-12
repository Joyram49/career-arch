import { sendError } from '@utils/apiResponse';

import type { IFieldError } from '@app-types/index';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodError, ZodTypeAny } from 'zod';

/**
 * Middleware factory that validates request against a Zod schema.
 * Schema should have shape: { body?, query?, params?, cookies? }
 */
export const validate =
  (schema: ZodTypeAny): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    const payload: Record<string, unknown> = {
      body: req.body,
      query: req.query,
      params: req.params,
      cookies: req.cookies,
    };
    const result = schema.safeParse(payload);

    if (!result.success) {
      const errors: IFieldError[] = formatZodErrors(result.error);
      sendError(res, 'Validation failed', 400, errors);
      return;
    }

    // Attach parsed/coerced values back to request
    const parsed = result.data as { body?: Record<string, unknown> };
    if (parsed.body !== undefined) {
      req.body = parsed.body;
    }

    next();
  };

function formatZodErrors(error: ZodError): IFieldError[] {
  return error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}
