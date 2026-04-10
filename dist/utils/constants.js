"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTP_STATUS = exports.RATE_LIMIT = exports.PASSWORD = exports.INCENTIVE = exports.FILE_UPLOAD = exports.PAGINATION = exports.PLAN_HIERARCHY = exports.TOKEN_EXPIRY = exports.REFRESH_COOKIE_OPTIONS_REMEMBER_ME = exports.REFRESH_COOKIE_OPTIONS = exports.ACCESS_COOKIE_OPTIONS = exports.COOKIE_OPTIONS = exports.COOKIE_NAMES = void 0;
exports.COOKIE_NAMES = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
};
exports.COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    path: '/',
};
exports.ACCESS_COOKIE_OPTIONS = {
    ...exports.COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000,
};
exports.REFRESH_COOKIE_OPTIONS = {
    ...exports.COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
};
exports.REFRESH_COOKIE_OPTIONS_REMEMBER_ME = {
    ...exports.COOKIE_OPTIONS,
    maxAge: 30 * 24 * 60 * 60 * 1000,
};
exports.TOKEN_EXPIRY = {
    ACCESS: '15m',
    REFRESH: '7d',
    REFRESH_REMEMBER_ME: '30d',
    EMAIL_VERIFY: '24h',
    PASSWORD_RESET: '1h',
    TWO_FA_TEMP: '5m',
};
exports.PLAN_HIERARCHY = {
    FREE: 0,
    BASIC: 1,
    PREMIUM: 2,
};
exports.PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
};
exports.FILE_UPLOAD = {
    MAX_RESUME_SIZE: 5 * 1024 * 1024,
    MAX_IMAGE_SIZE: 2 * 1024 * 1024,
    ALLOWED_RESUME_TYPES: ['application/pdf'],
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};
exports.INCENTIVE = {
    AMOUNT_CENTS: 5000,
    PAYMENT_WINDOW_DAYS: 7,
};
exports.PASSWORD = {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
};
exports.RATE_LIMIT = {
    WINDOW_MS: 15 * 60 * 1000,
    MAX_GENERAL: 100,
    MAX_LOGIN: 5,
    MAX_REGISTER: 10,
    MAX_FORGOT_PASSWORD: 3,
};
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500,
};
//# sourceMappingURL=constants.js.map