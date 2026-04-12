import { PASSWORD } from '@utils/constants';
import { z } from 'zod';

// ── Password validation rule (reusable) ───────────────────────────────────
const passwordSchema = z
  .string()
  .min(PASSWORD.MIN_LENGTH, `Password must be at least ${PASSWORD.MIN_LENGTH} characters`)
  .max(PASSWORD.MAX_LENGTH, `Password must be at most ${PASSWORD.MAX_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const emailSchema = z.string().email('Invalid email address').toLowerCase().trim();

// ─────────────────────────────────────────────
// USER AUTH SCHEMAS
// ─────────────────────────────────────────────

export const userRegisterSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: z
      .string()
      .trim()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must be at most 50 characters'),
    lastName: z
      .string()
      .trim()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must be at most 50 characters'),
  }),
});

export const userLoginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string().min(1, 'Reset token is required'),
      newPassword: passwordSchema,
      confirmPassword: z.string().min(1, 'Confirm password is required'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

export const verifyEmailSchema = z.object({
  query: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
});

export const resendVerificationSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

export const twoFaVerifySchema = z.object({
  body: z.object({
    otp: z
      .string()
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d{6}$/, 'OTP must contain only digits'),
  }),
});

export const twoFaValidateSchema = z.object({
  body: z.object({
    tempToken: z.string().min(1, 'Temporary token is required'),
    otp: z
      .string()
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d{6}$/, 'OTP must contain only digits'),
  }),
});

export const twoFaDisableSchema = z.object({
  body: z.object({
    password: z.string().min(1, 'Password is required to disable 2FA'),
    otp: z
      .string()
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d{6}$/, 'OTP must contain only digits'),
  }),
});

export const refreshTokenSchema = z.object({
  cookies: z.object({
    refresh_token: z.string().min(1, 'Refresh token is required'),
  }),
});

// ─────────────────────────────────────────────
// ORGANIZATION AUTH SCHEMAS
// ─────────────────────────────────────────────

export const orgRegisterSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    companyName: z
      .string()
      .min(2, 'Company name must be at least 2 characters')
      .max(100, 'Company name must be at most 100 characters')
      .trim(),
  }),
});

export const orgLoginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false),
  }),
});

// ─────────────────────────────────────────────
// ADMIN AUTH SCHEMAS
// ─────────────────────────────────────────────

export const adminLoginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
  }),
});

// ─────────────────────────────────────────────
// CHANGE PASSWORD SCHEMA (authenticated)
// ─────────────────────────────────────────────

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: passwordSchema,
      confirmPassword: z.string().min(1, 'Confirm password is required'),
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

// ── Inferred Types ─────────────────────────────────────────────────────────
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
