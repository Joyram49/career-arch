"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
const envFile = `.env.${process.env['NODE_ENV'] ?? 'development'}`;
dotenv_1.default.config({
    path: path_1.default.resolve(process.cwd(), envFile),
});
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']),
    PORT: zod_1.z.coerce.number().default(5000),
    API_VERSION: zod_1.z.string().default('v1'),
    FRONTEND_URL: zod_1.z.string().url(),
    API_URL: zod_1.z.string().url(),
    DATABASE_URL: zod_1.z.string().url(),
    REDIS_URL: zod_1.z.string().url(),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    JWT_ACCESS_EXPIRY: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRY: zod_1.z.string().default('7d'),
    JWT_REFRESH_EXPIRY_REMEMBER_ME: zod_1.z.string().default('30d'),
    BCRYPT_ROUNDS: zod_1.z.coerce.number().default(12),
    SENDGRID_API_KEY: zod_1.z.string().min(1),
    MAIL_FROM_ADDRESS: zod_1.z.string().email(),
    MAIL_FROM_NAME: zod_1.z.string().default('CareerArch'),
    STRIPE_SECRET_KEY: zod_1.z.string().min(1),
    STRIPE_PUBLISHABLE_KEY: zod_1.z.string().min(1),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().min(1),
    STRIPE_BASIC_PRICE_ID: zod_1.z.string().min(1),
    STRIPE_PREMIUM_PRICE_ID: zod_1.z.string().min(1),
    STRIPE_INCENTIVE_AMOUNT: zod_1.z.coerce.number().default(5000),
    STRIPE_CURRENCY: zod_1.z.string().default('usd'),
    AWS_ACCESS_KEY_ID: zod_1.z.string().min(1),
    AWS_SECRET_ACCESS_KEY: zod_1.z.string().min(1),
    AWS_REGION: zod_1.z.string().default('us-east-1'),
    AWS_S3_BUCKET: zod_1.z.string().min(1),
    GOOGLE_CLIENT_ID: zod_1.z.string().min(1),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().min(1),
    GOOGLE_CALLBACK_URL: zod_1.z.string().url(),
    LINKEDIN_CLIENT_ID: zod_1.z.string().min(1),
    LINKEDIN_CLIENT_SECRET: zod_1.z.string().min(1),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().default(900000),
    RATE_LIMIT_MAX: zod_1.z.coerce.number().default(100),
    LOGIN_RATE_LIMIT_MAX: zod_1.z.coerce.number().default(5),
    SENTRY_DSN: zod_1.z.string().default(''),
    ALLOWED_ORIGINS: zod_1.z
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
exports.env = parsed.data;
//# sourceMappingURL=env.js.map