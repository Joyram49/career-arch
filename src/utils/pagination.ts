import { PAGINATION } from './constants';

import type { IPaginationMeta, IPaginationQuery } from '@app-types/index';

export interface IParsedPagination {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

/**
 * Parses page and limit from query params, applying safe defaults and caps.
 *
 * @example
 * const { skip, take, page, limit } = parsePagination(req.query);
 * const users = await prisma.user.findMany({ skip, take });
 */
export function parsePagination(query: IPaginationQuery): IParsedPagination {
  const parsedPage = Number(query.page);
  const parsedLimit = Number(query.limit);

  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? PAGINATION.DEFAULT_PAGE : parsedPage;

  const limit =
    Number.isNaN(parsedLimit) || parsedLimit < 1
      ? PAGINATION.DEFAULT_LIMIT
      : Math.min(parsedLimit, PAGINATION.MAX_LIMIT);

  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
}

/**
 * Builds the pagination meta object returned in every paginated API response.
 *
 * @example
 * const meta = buildPaginationMeta(total, page, limit);
 * return sendSuccess(res, data, 'OK', 200, meta);
 */
export function buildPaginationMeta(total: number, page: number, limit: number): IPaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
