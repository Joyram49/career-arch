import type { ITokenPair, ITwoFactorSetupResponse, IUserAuthResponse } from '@app-types/index';
export declare function registerUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}): Promise<{
    message: string;
}>;
export declare function verifyEmail(token: string): Promise<{
    message: string;
}>;
export declare function resendVerificationEmail(email: string): Promise<{
    message: string;
}>;
export interface ILoginResult {
    requires2FA?: boolean;
    tempToken?: string;
    tokens?: ITokenPair;
    user?: IUserAuthResponse;
}
export declare function loginUser(data: {
    email: string;
    password: string;
    rememberMe: boolean;
}): Promise<ILoginResult>;
export declare function validateTwoFa(data: {
    tempToken: string;
    otp: string;
}): Promise<{
    tokens: ITokenPair;
    user: IUserAuthResponse;
}>;
export declare function logoutUser(accessToken: string, refreshToken: string): Promise<void>;
export declare function refreshUserToken(rawRefreshToken: string): Promise<ITokenPair>;
export declare function forgotPassword(email: string): Promise<{
    message: string;
}>;
export declare function resetPassword(data: {
    token: string;
    newPassword: string;
}): Promise<{
    message: string;
}>;
export declare function setupTwoFa(userId: string): Promise<ITwoFactorSetupResponse>;
export declare function verifyAndEnableTwoFa(userId: string, otp: string): Promise<{
    message: string;
    backupCodes: string[];
}>;
export declare function disableTwoFa(userId: string, password: string, otp: string): Promise<{
    message: string;
}>;
export declare function getUserMe(userId: string): Promise<IUserAuthResponse>;
//# sourceMappingURL=user.auth.service.d.ts.map