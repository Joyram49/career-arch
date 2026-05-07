// ── Cookie Names ───────────────────────────────────────────────────────────
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

// ── Cookie Options ─────────────────────────────────────────────────────────
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

export const ACCESS_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

export const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const REFRESH_COOKIE_OPTIONS_REMEMBER_ME = {
  ...COOKIE_OPTIONS,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// ── Token Expiry Strings ───────────────────────────────────────────────────
export const TOKEN_EXPIRY = {
  ACCESS: '15m',
  REFRESH: '7d',
  REFRESH_REMEMBER_ME: '30d',
  EMAIL_VERIFY: '24h',
  PASSWORD_RESET: '1h',
  TWO_FA_TEMP: '5m',
} as const;

// ── Subscription Plan Hierarchy ────────────────────────────────────────────
export const PLAN_HIERARCHY = {
  FREE: 0,
  BASIC: 1,
  PREMIUM: 2,
} as const;

// ── Pagination Defaults ────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ── File Upload ────────────────────────────────────────────────────────────
export const FILE_UPLOAD = {
  MAX_RESUME_SIZE: 5 * 1024 * 1024, // 5 MB
  MAX_IMAGE_SIZE: 2 * 1024 * 1024, // 2 MB
  ALLOWED_RESUME_TYPES: ['application/pdf'],
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
} as const;

// ── Hiring Incentive ───────────────────────────────────────────────────────
export const INCENTIVE = {
  AMOUNT_CENTS: 5000, // $50.00
  PAYMENT_WINDOW_DAYS: 7,
} as const;

// ── Password Rules ─────────────────────────────────────────────────────────
export const PASSWORD = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
} as const;

// ── Rate Limit ─────────────────────────────────────────────────────────────
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_GENERAL: 100,
  MAX_LOGIN: 5,
  MAX_REGISTER: 10,
  MAX_FORGOT_PASSWORD: 3,
} as const;

// ── HTTP Status Codes ──────────────────────────────────────────────────────
export const HTTP_STATUS = {
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
} as const;
