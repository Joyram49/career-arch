import type { ZodTypeAny, z } from 'zod';

// ── Internal type ──────────────────────────────────────────────────────────
// Matches the intersection used in validate.ts — no global augmentation needed.
type RequestLike = {
  query: Record<string, unknown>;
  parsedQuery?: Record<string, unknown>;
};

// ── QueryBuilder ───────────────────────────────────────────────────────────

/**
 * Generic query builder — works for any route (users, jobs, applications…).
 *
 * Reads req.parsedQuery (written by validate middleware) and re-runs the
 * provided Zod schema to return a fully typed, fully defaulted query object.
 *
 * Falls back to raw req.query if validate middleware was not used, so the
 * builder is safe to call standalone in tests or simple routes.
 *
 * Usage:
 *   const query = new QueryBuilder(req, adminListUsersSchema.shape.query).build();
 *   // query is fully typed: { page: number; limit: number; sortBy: string; … }
 *
 * @template S — Any Zod schema whose output describes the query shape.
 */
export class QueryBuilder<S extends ZodTypeAny> {
  private readonly raw: Record<string, unknown>;
  private readonly schema: S;

  constructor(req: RequestLike, schema: S) {
    // parsedQuery has Zod coercions + defaults already applied.
    // Fall back to raw req.query when middleware was skipped.
    this.raw = req.parsedQuery ?? req.query;
    this.schema = schema;
  }

  /**
   * Parse and validate the raw source against the schema.
   * Returns the typed output with all defaults applied.
   * Throws on failure — caught by asyncHandler → global errorHandler.
   */
  build(): z.infer<S> {
    const result = this.schema.safeParse(this.raw);
    if (!result.success) {
      const messages = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', ');
      throw new Error(`Query validation failed — ${messages}`);
    }
    return result.data as z.infer<S>;
  }
}

// ── Pagination helper ──────────────────────────────────────────────────────

export interface IParsedPagination {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Extract page/limit from any parsed query object and compute skip.
 *
 * Applies safe numeric coercion with fallbacks — Prisma always receives
 * concrete integers, never undefined, NaN, or a string.
 *
 * Can be used with any query object regardless of route type.
 */
export function extractPagination(
  parsed: Record<string, unknown>,
  defaults: { page?: number; limit?: number } = {},
): IParsedPagination {
  const page = toPositiveInt(parsed['page'], defaults.page ?? 1);
  const limit = toPositiveInt(parsed['limit'], defaults.limit ?? 20);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// ── Internal helpers ───────────────────────────────────────────────────────

function toPositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}
