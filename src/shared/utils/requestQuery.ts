import type { Request } from 'express';

/**
 * After `validate()` runs a Zod schema with a `query` key, parsed output (including
 * defaults and coercions) is stored here — Express `req.query` is read-only in this app.
 */
export type RequestWithValidatedQuery<Q = Record<string, unknown>> = Request & {
  validatedQuery?: Q;
};

/** Prefer Zod-parsed query when present; otherwise raw `req.query`. */
export function getParsedQuery<Q>(req: Request): Q {
  const r = req as RequestWithValidatedQuery<Q>;
  return (r.validatedQuery ?? r.query) as Q;
}
