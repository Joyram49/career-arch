import type { IAdminAuthResponse, ITokenPair } from '@app-types/index';
export declare function loginAdmin(data: {
    email: string;
    password: string;
}): Promise<{
    tokens: ITokenPair;
    admin: IAdminAuthResponse;
}>;
export declare function logoutAdmin(accessToken: string, refreshToken: string): Promise<void>;
export declare function refreshAdminToken(rawRefreshToken: string): Promise<ITokenPair>;
export declare function getAdminMe(adminId: string): Promise<IAdminAuthResponse>;
//# sourceMappingURL=admin.auth.service.d.ts.map