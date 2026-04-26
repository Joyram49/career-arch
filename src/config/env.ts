import path from 'path';

import dotenv from 'dotenv';
import { z } from 'zod';

const NODE_ENV = process.env['NODE_ENV'] ?? 'development';
const IS_DOCKER = process.env['IS_DOCKER'] === 'true';

// Load base env file for the environment
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${NODE_ENV}`),
});

// In Docker, overlay with docker-specific overrides (REDIS_URL, DATABASE_URL etc.)
if (IS_DOCKER) {
  dotenv.config({
    path: path.resolve(process.cwd(), '.env.docker'),
    override: true, // docker values win over base env
  });
}
const envSchema = z.object({
  // ── Server ───────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(5000),
  API_VERSION: z.string().default('v1'),
  FRONTEND_URL: z.string().url(),
  API_URL: z.string().url(),
  IS_DOCKER: z.coerce.boolean().default(false),

  // ── Database ─────────────────────────────────────────────────────
  DATABASE_URL: z.string().url(),

  // ── Redis ────────────────────────────────────────────────────────
  REDIS_URL: z.string().url(),

  // ── JWT ──────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  JWT_REFRESH_EXPIRY_REMEMBER_ME: z.string().default('30d'),

  // ── Bcrypt ───────────────────────────────────────────────────────
  BCRYPT_ROUNDS: z.coerce.number().default(12),

  // ── Email ────────────────────────────────────────────────────────
  BREVO_SMTP_KEY: z.string().min(1),
  BREVO_SMTP_USER: z.string().min(1),
  MAIL_FROM_ADDRESS: z.string().email(),
  MAIL_FROM_NAME: z.string().default('CareerArch'),

  // ── Stripe ───────────────────────────────────────────────────────
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_BASIC_PRICE_ID: z.string().min(1),
  STRIPE_PREMIUM_PRICE_ID: z.string().min(1),
  STRIPE_INCENTIVE_AMOUNT: z.coerce.number().default(5000),
  STRIPE_CURRENCY: z.string().default('usd'),

  // ── Cloudinary ───────────────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().trim().min(1, { error: 'cloud name is required' }),
  CLOUDINARY_API_KEY: z.string().trim().min(1, { error: 'cloud api key is required' }),
  CLOUDINARY_API_SECRET: z.string().trim().min(1, { error: 'cloud secret key is required' }),

  // ── OAuth ────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),

  LINKEDIN_CLIENT_ID: z.string().min(1),
  LINKEDIN_CLIENT_SECRET: z.string().min(1),

  // ── Rate Limiting ─────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().default(5),

  // ── Sentry ───────────────────────────────────────────────────────
  SENTRY_DSN: z.string().default(''),

  // ── CORS ─────────────────────────────────────────────────────────
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((val) => val.split(',').map((s) => s.trim())),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:\n');
  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;

export type Env = typeof env;
