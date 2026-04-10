import type { IOrgAuthResponse, ITokenPair, ITwoFactorSetupResponse } from '@app-types/index';
export declare function registerOrg(data: {
    email: string;
    password: string;
    companyName: string;
}): Promise<{
    message: string;
}>;
export declare function verifyOrgEmail(token: string): Promise<{
    message: string;
}>;
export interface IOrgLoginResult {
    requires2FA?: boolean;
    tempToken?: string;
    tokens?: ITokenPair;
    organization?: IOrgAuthResponse;
}
export declare function loginOrg(data: {
    email: string;
    password: string;
    rememberMe: boolean;
}): Promise<IOrgLoginResult>;
export declare function validateOrgTwoFa(data: {
    tempToken: string;
    otp: string;
}): Promise<{
    tokens: ITokenPair;
    organization: IOrgAuthResponse;
}>;
export declare function logoutOrg(accessToken: string, refreshToken: string): Promise<void>;
export declare function refreshOrgToken(rawRefreshToken: string): Promise<ITokenPair>;
export declare function forgotOrgPassword(email: string): Promise<{
    message: string;
}>;
export declare function resetOrgPassword(data: {
    token: string;
    newPassword: string;
}): Promise<{
    message: string;
}>;
export declare function setupOrgTwoFa(orgId: string): Promise<ITwoFactorSetupResponse>;
export declare function verifyAndEnableOrgTwoFa(orgId: string, otp: string): Promise<{
    message: string;
    backupCodes: string[];
}>;
export declare function getOrgMe(orgId: string): Promise<IOrgAuthResponse>;
//# sourceMappingURL=org.auth.service.d.ts.map