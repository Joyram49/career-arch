import Redis from 'ioredis';
export declare const redis: Redis;
export declare const RedisKeys: {
    readonly blacklistToken: (jti: string) => string;
    readonly loginAttempts: (identifier: string) => string;
    readonly emailVerifyToken: (token: string) => string;
    readonly passwordResetToken: (token: string) => string;
    readonly twoFaTempToken: (token: string) => string;
    readonly session: (userId: string) => string;
    readonly refreshToken: (tokenId: string) => string;
};
export declare const RedisExpiry: {
    readonly ACCESS_TOKEN: number;
    readonly REFRESH_TOKEN: number;
    readonly EMAIL_VERIFY: number;
    readonly PASSWORD_RESET: number;
    readonly TWO_FA_TEMP: number;
    readonly BLACKLIST: number;
};
//# sourceMappingURL=redis.d.ts.map