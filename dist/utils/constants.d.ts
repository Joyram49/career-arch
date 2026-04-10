export declare const COOKIE_NAMES: {
    readonly ACCESS_TOKEN: "access_token";
    readonly REFRESH_TOKEN: "refresh_token";
};
export declare const COOKIE_OPTIONS: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "strict";
    path: string;
};
export declare const ACCESS_COOKIE_OPTIONS: {
    maxAge: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "strict";
    path: string;
};
export declare const REFRESH_COOKIE_OPTIONS: {
    maxAge: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "strict";
    path: string;
};
export declare const REFRESH_COOKIE_OPTIONS_REMEMBER_ME: {
    maxAge: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "strict";
    path: string;
};
export declare const TOKEN_EXPIRY: {
    readonly ACCESS: "15m";
    readonly REFRESH: "7d";
    readonly REFRESH_REMEMBER_ME: "30d";
    readonly EMAIL_VERIFY: "24h";
    readonly PASSWORD_RESET: "1h";
    readonly TWO_FA_TEMP: "5m";
};
export declare const PLAN_HIERARCHY: {
    readonly FREE: 0;
    readonly BASIC: 1;
    readonly PREMIUM: 2;
};
export declare const PAGINATION: {
    readonly DEFAULT_PAGE: 1;
    readonly DEFAULT_LIMIT: 20;
    readonly MAX_LIMIT: 100;
};
export declare const FILE_UPLOAD: {
    readonly MAX_RESUME_SIZE: number;
    readonly MAX_IMAGE_SIZE: number;
    readonly ALLOWED_RESUME_TYPES: readonly ["application/pdf"];
    readonly ALLOWED_IMAGE_TYPES: readonly ["image/jpeg", "image/jpg", "image/png", "image/webp"];
};
export declare const INCENTIVE: {
    readonly AMOUNT_CENTS: 5000;
    readonly PAYMENT_WINDOW_DAYS: 7;
};
export declare const PASSWORD: {
    readonly MIN_LENGTH: 8;
    readonly MAX_LENGTH: 128;
};
export declare const RATE_LIMIT: {
    readonly WINDOW_MS: number;
    readonly MAX_GENERAL: 100;
    readonly MAX_LOGIN: 5;
    readonly MAX_REGISTER: 10;
    readonly MAX_FORGOT_PASSWORD: 3;
};
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_ERROR: 500;
};
//# sourceMappingURL=constants.d.ts.map