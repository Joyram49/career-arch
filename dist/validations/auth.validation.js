"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.adminLoginSchema = exports.orgLoginSchema = exports.orgRegisterSchema = exports.refreshTokenSchema = exports.twoFaDisableSchema = exports.twoFaValidateSchema = exports.twoFaVerifySchema = exports.resendVerificationSchema = exports.verifyEmailSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.userLoginSchema = exports.userRegisterSchema = void 0;
const constants_1 = require("@utils/constants");
const zod_1 = require("zod");
const passwordSchema = zod_1.z
    .string()
    .min(constants_1.PASSWORD.MIN_LENGTH, `Password must be at least ${constants_1.PASSWORD.MIN_LENGTH} characters`)
    .max(constants_1.PASSWORD.MAX_LENGTH, `Password must be at most ${constants_1.PASSWORD.MAX_LENGTH} characters`)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
const emailSchema = zod_1.z.string().email('Invalid email address').toLowerCase().trim();
exports.userRegisterSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailSchema,
        password: passwordSchema,
        firstName: zod_1.z
            .string()
            .min(2, 'First name must be at least 2 characters')
            .max(50, 'First name must be at most 50 characters')
            .trim(),
        lastName: zod_1.z
            .string()
            .min(2, 'Last name must be at least 2 characters')
            .max(50, 'Last name must be at most 50 characters')
            .trim(),
    }),
});
exports.userLoginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailSchema,
        password: zod_1.z.string().min(1, 'Password is required'),
        rememberMe: zod_1.z.boolean().optional().default(false),
    }),
});
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailSchema,
    }),
});
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        token: zod_1.z.string().min(1, 'Reset token is required'),
        newPassword: passwordSchema,
        confirmPassword: zod_1.z.string().min(1, 'Confirm password is required'),
    })
        .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    }),
});
exports.verifyEmailSchema = zod_1.z.object({
    query: zod_1.z.object({
        token: zod_1.z.string().min(1, 'Verification token is required'),
    }),
});
exports.resendVerificationSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailSchema,
    }),
});
exports.twoFaVerifySchema = zod_1.z.object({
    body: zod_1.z.object({
        otp: zod_1.z
            .string()
            .length(6, 'OTP must be exactly 6 digits')
            .regex(/^\d{6}$/, 'OTP must contain only digits'),
    }),
});
exports.twoFaValidateSchema = zod_1.z.object({
    body: zod_1.z.object({
        tempToken: zod_1.z.string().min(1, 'Temporary token is required'),
        otp: zod_1.z
            .string()
            .length(6, 'OTP must be exactly 6 digits')
            .regex(/^\d{6}$/, 'OTP must contain only digits'),
    }),
});
exports.twoFaDisableSchema = zod_1.z.object({
    body: zod_1.z.object({
        password: zod_1.z.string().min(1, 'Password is required to disable 2FA'),
        otp: zod_1.z
            .string()
            .length(6, 'OTP must be exactly 6 digits')
            .regex(/^\d{6}$/, 'OTP must contain only digits'),
    }),
});
exports.refreshTokenSchema = zod_1.z.object({
    cookies: zod_1.z.object({
        refresh_token: zod_1.z.string().min(1, 'Refresh token is required'),
    }),
});
exports.orgRegisterSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailSchema,
        password: passwordSchema,
        companyName: zod_1.z
            .string()
            .min(2, 'Company name must be at least 2 characters')
            .max(100, 'Company name must be at most 100 characters')
            .trim(),
    }),
});
exports.orgLoginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailSchema,
        password: zod_1.z.string().min(1, 'Password is required'),
        rememberMe: zod_1.z.boolean().optional().default(false),
    }),
});
exports.adminLoginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailSchema,
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        currentPassword: zod_1.z.string().min(1, 'Current password is required'),
        newPassword: passwordSchema,
        confirmPassword: zod_1.z.string().min(1, 'Confirm password is required'),
    })
        .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    })
        .refine((data) => data.currentPassword !== data.newPassword, {
        message: 'New password must be different from current password',
        path: ['newPassword'],
    }),
});
//# sourceMappingURL=auth.validation.js.map