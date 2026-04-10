import type { IJwtPayload } from '@app-types/index';
export declare function generateAccessToken(payload: Omit<IJwtPayload, 'jti'>): string;
export declare function verifyAccessToken(token: string): IJwtPayload;
export declare function generateRefreshToken(payload: Omit<IJwtPayload, 'jti'>): string;
export declare function generateRefreshTokenRememberMe(payload: Omit<IJwtPayload, 'jti'>): string;
export declare function verifyRefreshToken(token: string): IJwtPayload;
export declare function generateSecureToken(bytes?: number): string;
export declare function hashToken(token: string): string;
export declare function compareToken(rawToken: string, hashedToken: string): boolean;
export declare function getExpiryDate(duration: string): Date;
export declare function generateOtp(length?: number): string;
export declare function extractJti(token: string): string | null;
export declare function getTokenTtl(token: string): number;
//# sourceMappingURL=token.d.ts.map