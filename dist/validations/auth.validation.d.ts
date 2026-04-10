import { z } from 'zod';
export declare const userRegisterSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        firstName: z.ZodString;
        lastName: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const userLoginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        rememberMe: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const forgotPasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const resetPasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        token: z.ZodString;
        newPassword: z.ZodString;
        confirmPassword: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const verifyEmailSchema: z.ZodObject<{
    query: z.ZodObject<{
        token: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const resendVerificationSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const twoFaVerifySchema: z.ZodObject<{
    body: z.ZodObject<{
        otp: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const twoFaValidateSchema: z.ZodObject<{
    body: z.ZodObject<{
        tempToken: z.ZodString;
        otp: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const twoFaDisableSchema: z.ZodObject<{
    body: z.ZodObject<{
        password: z.ZodString;
        otp: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const refreshTokenSchema: z.ZodObject<{
    cookies: z.ZodObject<{
        refresh_token: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const orgRegisterSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        companyName: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const orgLoginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        rememberMe: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const adminLoginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const changePasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        currentPassword: z.ZodString;
        newPassword: z.ZodString;
        confirmPassword: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type UserRegisterInput = z.infer<typeof userRegisterSchema>['body'];
export type UserLoginInput = z.infer<typeof userLoginSchema>['body'];
export type OrgRegisterInput = z.infer<typeof orgRegisterSchema>['body'];
export type OrgLoginInput = z.infer<typeof orgLoginSchema>['body'];
export type AdminLoginInput = z.infer<typeof adminLoginSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type TwoFaVerifyInput = z.infer<typeof twoFaVerifySchema>['body'];
export type TwoFaValidateInput = z.infer<typeof twoFaValidateSchema>['body'];
export type TwoFaDisableInput = z.infer<typeof twoFaDisableSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
//# sourceMappingURL=auth.validation.d.ts.map