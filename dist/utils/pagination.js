"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePagination = parsePagination;
exports.buildPaginationMeta = buildPaginationMeta;
const constants_1 = require("./constants");
function parsePagination(query) {
    const page = Math.max(1, Number(query.limit) || constants_1.PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(constants_1.PAGINATION.MAX_LIMIT, Math.max(1, Number(query.limit) || constants_1.PAGINATION.DEFAULT_LIMIT));
    const skip = (page - 1) * limit;
    return { skip, take: limit, page, limit };
}
function buildPaginationMeta(total, page, limit) {
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
//# sourceMappingURL=pagination.js.map