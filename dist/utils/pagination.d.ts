import type { IPaginationMeta, IPaginationQuery } from '@app-types/index';
export interface IParsedPagination {
    skip: number;
    take: number;
    page: number;
    limit: number;
}
export declare function parsePagination(query: IPaginationQuery): IParsedPagination;
export declare function buildPaginationMeta(total: number, page: number, limit: number): IPaginationMeta;
//# sourceMappingURL=pagination.d.ts.map