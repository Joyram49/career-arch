# 🏢 CareerArch — Bird's Eye View Documentation

> **Version:** 1.0.0 | **Status:** Phase 3 Complete (Test cases & OAuth pending)
> **Live API:**
> [https://career-arch.onrender.com/api/v1](https://career-arch.onrender.com/api/v1)
> **API Docs:**
> [https://career-arch.onrender.com/api-docs](https://career-arch.onrender.com/api-docs)
> **Repo:**
> [https://github.com/Joyram49/career-arch](https://github.com/Joyram49/career-arch)

---

## 1. What Is CareerArch?

CareerArch is a **production-grade, full-stack job portal platform** inspired by
Glassdoor. It connects job seekers (talent) with employers (organizations)
through a secure, subscription-gated, real-time hiring pipeline — managed by an
admin.

The platform is not a simple CRUD app. It is a complete hiring ecosystem with:

- JWT-based multi-role authentication (User, Organization, Admin)
- Subscription billing via Stripe (Free / Basic / Premium)
- Real-time notifications via Socket.IO
- Async email delivery via BullMQ + Brevo SMTP
- A hiring incentive system ($50 per successful hire, paid via Stripe)
- Feature gating tied to plan limits (apply count, saved jobs, org profile
  access)
- Background cron workers for monthly resets, incentive overdue marking, and job
  cleanup

---

## 2. The Three Roles

| Role              | Who They Are                            | What They Can Do                                                                                           |
| ----------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **USER (Talent)** | Job seekers registering on the platform | Browse jobs, apply (plan-gated), save jobs, track applications, manage subscription                        |
| **ORGANIZATION**  | Employers posting jobs                  | Register (admin-approval required), post jobs, manage hiring pipeline, pay $50 incentive per hire          |
| **ADMIN**         | Platform super-user                     | Approve/suspend orgs & users, manage plan catalogue, view platform stats, waive/resolve incentive disputes |

---

## 3. The Three Subscription Plans (User Only)

| Plan        | Price     | Apply/Month | Saved Jobs | Key Features                                          |
| ----------- | --------- | ----------- | ---------- | ----------------------------------------------------- |
| **FREE**    | $0        | 5           | 5          | First 20 jobs only, no org profile access             |
| **BASIC**   | $9.99/mo  | 30          | 50         | All jobs, org profiles, early alerts, resume versions |
| **PREMIUM** | $24.99/mo | Unlimited   | Unlimited  | Priority search, AI resume tips, all features         |

Plan features are stored in a `PlanCatalogue` DB table managed by admin, synced
to Stripe Products and Prices.

---

## 4. The Hiring Incentive System

When an organization marks a candidate as **HIRED**:

1. A `HiringIncentive` record ($50) is auto-created
2. Org's `hasUnpaidIncentives` flag is set to `true`
3. Org receives a real-time Socket.IO event + email
4. Org must pay within **7 days** via their saved Stripe card (off-session
   charge)
5. Unpaid incentives block new job postings (`requireOrgReady` middleware)
6. Overdue incentives are marked `OVERDUE` by a daily BullMQ cron at 02:30 UTC
7. Admin can waive or force-resolve disputed incentives

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│         Next.js 15 Frontend (planned — Phase 4)             │
│    User Dashboard | Org Dashboard | Admin Dashboard         │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP + WebSocket
┌───────────────────────────▼─────────────────────────────────┐
│                     EXPRESS API (Node.js v20)               │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  REST Routes│  │ Socket.IO    │  │  Stripe Webhooks    │ │
│  │  /api/v1/.. │  │ (real-time)  │  │  /api/v1/webhooks/  │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘ │
│         │                │                       │          │
│  ┌──────▼──────────────────────────────────────▼──────────┐ │
│  │             MIDDLEWARE STACK                           │ │
│  │  Helmet · CORS · HPP · Rate Limiters · Cookie Parser   │ │
│  │  authenticate · authorize · validate (Zod)             │ │
│  │  checkApplyLimit · checkJobPlan · checkSaveJobLimit    │ │
│  │  requireOrgReady · checkOrgProfileAccess · asyncHandler│ │
│  └──────────────────────────┬─────────────────────────────┘ │
│                             │                               │
│  ┌──────────────────────────▼─────────────────────────────┐ │
│  │                   SERVICE LAYER                        │ │
│  │      Auth · Jobs · Applications · Subscriptions        | |
|  |           · Incentives . Profile · Notifications       │ │
│  │          · Email · Upload · Admin                      │ │
│  └──────────┬───────────────────────────┬─────────────────┘ │
│             │                           │                   │
│  ┌──────────▼──────────┐   ┌────────────▼────────────────┐  │
│  │   BullMQ Workers    │   │     External Services       │  │
│  │  email.worker.ts    │   │  Stripe SDK (payments)      │  │
│  │  subscription-reset │   │  Cloudinary (file uploads)  │  │
│  │  incentive-overdue  │   │  Brevo SMTP (email relay)   │  │
│  │  job-cleanup        │   │  Socket.IO (real-time)      │  │
│  └──────────┬──────────┘   └─────────────────────────────┘  │
└─────────────┼───────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────┐
│                    DATA LAYER                               │
│  PostgreSQL 16 (Prisma 7)        Redis (ioredis)            │
│  • All domain models             • JWT blacklist (logout)   │
│  • RefreshToken table            • BullMQ job queues        │
│  • PlanCatalogue                 • 2FA temp tokens          │
│  • HiringIncentive               • Rate limit counters      │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Full Tech Stack

### Backend

| Layer         | Technology                    | Purpose                     |
| ------------- | ----------------------------- | --------------------------- |
| Runtime       | Node.js v20 LTS               | Async I/O, large ecosystem  |
| Framework     | Express.js v5                 | REST API                    |
| Language      | TypeScript (strict)           | Type safety                 |
| ORM           | Prisma 7                      | DB queries + migrations     |
| Database      | PostgreSQL 16                 | Relational data storage     |
| Cache         | Redis (ioredis)               | Token blacklist, BullMQ     |
| Auth          | JWT (jsonwebtoken) + bcryptjs | Access + refresh tokens     |
| 2FA           | otplib + qrcode               | TOTP-based two-factor auth  |
| Payments      | Stripe SDK                    | Subscriptions + incentives  |
| File Upload   | Multer + Cloudinary           | Avatar, resume, org logo    |
| Email         | Nodemailer + Brevo SMTP       | Transactional emails        |
| Queue         | BullMQ                        | Async email + cron jobs     |
| Real-time     | Socket.IO                     | Application status updates  |
| Validation    | Zod 4                         | Request schema validation   |
| Rate Limiting | express-rate-limit            | Brute force protection      |
| Logging       | Winston + Morgan              | Structured logging + HTTP   |
| Monitoring    | Sentry                        | Error tracking              |
| API Docs      | Swagger (swagger-jsdoc)       | Auto-generated OpenAPI docs |
| Security      | Helmet + CORS + HPP           | HTTP header hardening       |
| Testing       | Jest + Supertest              | Unit + integration tests    |

### Infrastructure

| Layer              | Technology                  |
| ------------------ | --------------------------- |
| Backend Hosting    | Render (Docker, free tier)  |
| Database Hosting   | Supabase (PostgreSQL)       |
| Redis Hosting      | Upstash (free tier, TLS)    |
| File Storage       | Cloudinary                  |
| Email Relay        | Brevo (300 emails/day free) |
| CI/CD              | GitHub Actions              |
| Containerization   | Docker (multi-stage build)  |
| Frontend (planned) | Vercel + Next.js 15         |

---

## 7. Project Folder Structure

```
career-arch/
├── src/
│   ├── app.ts                          # Express app (middleware stack)
│   ├── server.ts                       # HTTP server + Socket.IO init + graceful shutdown
│   ├── swagger.ts                      # Swagger/OpenAPI setup
│   │
│   ├── config/
│   │   ├── database.ts                 # Prisma singleton
│   │   ├── redis.ts                    # ioredis singleton + RedisKeys + RedisExpiry
│   │   ├── email.ts                    # Nodemailer transporter (Brevo)
│   │   ├── stripe.ts                   # Stripe SDK init
│   │   ├── cloudinary.ts               # Cloudinary SDK init
│   │   ├── socket.ts                   # Socket.IO server init + auth middleware + emit helpers
│   │   ├── env.ts                      # Zod-validated env (exits on invalid)
│   │   └── logger.ts                   # Winston + daily rotate + Morgan stream
│   │
│   ├── routes/
│   │   ├── index.ts                    # Main router (mounts all sub-routers)
│   │   ├── auth/
│   │   │   ├── auth.user.routes.ts
│   │   │   ├── auth.org.routes.ts
│   │   │   └── auth.admin.routes.ts
│   │   ├── user/
│   │   │   ├── user.routes.ts          # Profile, avatar, resume, saved jobs
│   │   │   └── public.job.routes.ts    # Public job search + detail
│   │   ├── org/
│   │   │   ├── org.routes.ts           # Org profile + billing
│   │   │   ├── org.jobs.routes.ts      # Job CRUD + lifecycle
│   │   │   ├── org.job.applications.routes.ts  # GET /org/jobs/:jobId/applications
│   │   │   └── org.incentive.routes.ts # Incentive pay + dispute
│   │   ├── application/
│   │   │   ├── application.routes.ts   # User: apply, list, withdraw
│   │   │   └── org.application.routes.ts  # Org: list, get, update status
│   │   ├── admin/
│   │   │   ├── admin.user.routes.ts
│   │   │   ├── admin.org.routes.ts
│   │   │   ├── admin.plan.routes.ts
│   │   │   ├── admin.subscription.routes.ts
│   │   │   ├── admin.incentive.routes.ts
│   │   │   ├── admin.jobs.routes.ts
│   │   │   └── admin.dashboard.routes.ts
│   │   ├── subscription/
│   │   │   └── subscription.routes.ts
│   │   ├── notifications/
│   │   │   └── notification.routes.ts
│   │   └── webhooks/
│   │       └── webhook.routes.ts       # Stripe webhook (raw body parser)
│   │
│   ├── controllers/
│   │   ├── auth/
│   │   │   ├── user.auth.controller.ts
│   │   │   ├── org.auth.controller.ts
│   │   │   └── admin.auth.controller.ts
│   │   ├── user/
│   │   │   ├── user.profile.controller.ts
│   │   │   ├── saved.job.controller.ts
│   │   │   └── public.job.controller.ts
│   │   ├── org/
│   │   │   ├── org.profile.controller.ts
│   │   │   ├── org.billing.controller.ts
│   │   │   ├── org.jobs.controller.ts
│   │   │   └── org.incentive.controller.ts
│   │   ├── application/
│   │   │   ├── user.application.controller.ts
│   │   │   └── org.application.controller.ts
│   │   ├── admin/
│   │   │   ├── admin.user.controller.ts
│   │   │   ├── admin.org.controller.ts
│   │   │   ├── admin.plan.controller.ts
│   │   │   ├── admin.subscription.controller.ts
│   │   │   ├── admin.incentive.controller.ts
│   │   │   ├── admin.jobs.controller.ts
│   │   │   └── admin.stats.controller.ts
│   │   ├── subscription/
│   │   │   └── subscription.controller.ts
│   │   ├── notifications/
│   │   │   └── notification.controller.ts
│   │   ├── webhooks/
│   │   │   └── webhook.controller.ts
│   │   └── test/
│   │       └── payment-method.controller.ts  # TEST ONLY — remove before prod
│   │
│   ├── services/
│   │   ├── auth/
│   │   │   ├── user.auth.service.ts
│   │   │   ├── org.auth.service.ts
│   │   │   └── admin.auth.service.ts
│   │   ├── profile/
│   │   │   ├── user.profile.service.ts
│   │   │   └── org.profile.service.ts
│   │   ├── jobs/
│   │   │   ├── job.service.ts          # Org job CRUD + lifecycle + cleanup cron
│   │   │   ├── public.job.service.ts   # Public search + detail + plan gating
│   │   │   ├── saved.job.service.ts    # Save/unsave + counter management
│   │   │   └── admin.jobs.service.ts   # Admin list + takedown
│   │   ├── application/
│   │   │   └── application.service.ts  # Apply + status transitions + HIRED → incentive
│   │   ├── incentive/
│   │   │   └── incentive.service.ts    # Create, pay, dispute, waive, overdue cron
│   │   ├── subscription/
│   │   │   └── subscription.service.ts # Checkout, cancel, reactivate + all webhook handlers
│   │   ├── billing/
│   │   │   └── org.billing.service.ts  # SetupIntent, save/remove payment method
│   │   ├── notifications/
│   │   │   └── notification.service.ts # List, mark read, mark all read
│   │   ├── upload/
│   │   │   └── upload.service.ts       # Cloudinary avatar + resume upload/delete
│   │   ├── admin/
│   │   │   ├── admin.plan.service.ts   # Plan CRUD + Stripe Product/Price sync
│   │   │   ├── admin.subscription.service.ts  # Admin list subs + force cancel + refund
│   │   │   ├── admin.org.service.ts    # Approve, suspend, activate org
│   │   │   ├── admin.user.service.ts   # List, get, suspend, activate user
│   │   │   └── admin.stats.service.ts  # Platform dashboard stats
│   │   └── email.service.ts            # Template loader + all typed email senders
│   │
│   ├── middlewares/
│   │   ├── authenticate.ts             # JWT verify + Redis blacklist + optional variant
│   │   ├── authorize.ts                # RBAC role check
│   │   ├── validate.ts                 # Zod schema middleware factory
│   │   ├── rateLimiter.ts              # Per-route rate limiters
│   │   ├── upload.ts                   # Multer (avatar + resume)
│   │   ├── errorHandler.ts             # Global error handler + 404 handler
│   │   ├── checkApplyLimit.ts          # Guards POST /applications (monthly count)
│   │   ├── checkJobPlan.ts             # Guards POST /applications (plan vs job.requiredPlan)
│   │   ├── checkSaveJobLimit.ts        # Guards POST /jobs/:id/save (save count)
│   │   ├── checkOrgProfileAccess.ts    # Guards GET /org/profile/:id (plan check)
│   │   └── requireOrgReady.ts          # Guards org job endpoints (approved + payment + no overdue)
│   │
│   ├── validations/
│   │   ├── auth.validation.ts
│   │   ├── user.validation.ts
│   │   ├── org.validation.ts
│   │   ├── jobs.validation.ts
│   │   ├── application.validation.ts
│   │   ├── public.jobs.validation.ts
│   │   ├── subscription.validation.ts
│   │   ├── incentive.validation.ts
│   │   ├── notification.validation.ts
│   │   ├── admin.validation.ts
│   │   └── admin.jobs.validation.ts
│   │
│   ├── jobs/                           # BullMQ queues + workers
│   │   ├── queues/
│   │   │   ├── email.queue.ts          # Typed email job queue + enqueueEmail helper
│   │   │   ├── email.worker.ts         # Processes email queue (switch on payload.name)
│   │   │   └── subscription-reset.queue.ts  # Monthly apply counter reset (1st of month)
│   │   └── workers/
│   │       ├── incentive-overdue.worker.ts  # Daily 02:30 UTC — marks PENDING → OVERDUE
│   │       └── job-cleanup.worker.ts        # Daily 02:00 UTC — hard-deletes expired trash
│   │
│   ├── utils/
│   │   ├── token.ts                    # JWT generate/verify + crypto helpers
│   │   ├── apiError.ts                 # Custom error class hierarchy
│   │   ├── apiResponse.ts              # sendSuccess / sendCreated / sendError
│   │   ├── asyncHandler.ts             # Wraps async controllers
│   │   ├── constants.ts                # Cookie names, expiry values, plan hierarchy, etc.
│   │   ├── pagination.ts               # parsePagination + buildPaginationMeta
│   │   ├── queryBuilder.ts             # QueryBuilder class + extractPagination
│   │   ├── sanitize.ts                 # DOMPurify HTML sanitization (TipTap-safe tags)
│   │   ├── slug.ts                     # SEO slug generator (crypto suffix)
│   │   └── planFeaturesSchema.ts       # JSON → IPlanFeatures parser/validator
│   │
│   ├── types/
│   │   ├── index.ts                    # Re-exports
│   │   ├── auth.types.ts               # IJwtPayload, ITokenPair, IUserAuthResponse, etc.
│   │   ├── response.type.ts            # IApiResponse, IPaginationMeta, IFieldError
│   │   ├── email.types.ts              # IEmailJobData
│   │   └── subscription.ts             # IPlanFeatures, IMySubscriptionResponse, etc.
│   │
│   ├── templates/emails/               # HTML email templates ({{VAR}} placeholders)
│   │   ├── verify-email.html
│   │   ├── verify-email-org.html
│   │   ├── reset-password.html
│   │   ├── password-changed.html
│   │   ├── 2fa-enabled.html
│   │   ├── application-submitted-user.html
│   │   ├── application-submitted-org.html
│   │   ├── application-status-update.html
│   │   ├── subscription-activated.html
│   │   ├── subscription-cancelled.html
│   │   ├── subscription-downgraded.html
│   │   ├── payment-failed.html
│   │   ├── incentive-due.html
│   │   ├── incentive-paid.html
│   │   ├── incentive-overdue.html
│   │   ├── incentive-waived.html
│   │   ├── incentive-dispute-received.html
│   │   ├── org-approved.html
│   │   └── org-rejected.html
│   │
│   └── tests/
│       ├── unit/
│       │   └── token.utils.test.ts
│       ├── integration/
│       │   ├── user.auth.test.ts
│       │   ├── subscription.test.ts
│       │   └── incentive.test.ts
│       └── setup/
│           ├── env.ts                  # Test env defaults
│           ├── setupTests.ts           # Mock email + Redis cleanup
│           ├── globalSetup.ts
│           ├── globalTeardown.ts
│           └── mocks/
│               ├── stripe.ts
│               ├── uuid.ts
│               ├── otplib.ts
│               └── isomorphic-dompurify.ts
│
├── prisma/
│   ├── schema.prisma                   # Full schema (all models)
│   ├── migrations/                     # Migration history
│   └── seed.ts                         # Seeds admin + demo user + demo org + plan catalogue
│
├── docs/                               # Project documentation
├── .github/workflows/ci.yml            # Lint → Test → Build → Deploy pipeline
├── docker-compose.yml                  # Local: postgres + redis + redis-insight
├── docker-compose.prod.yml             # Self-hosted production (Render uses Dockerfile directly)
├── Dockerfile                          # Multi-stage: deps / builder / development / production
├── .env.example                        # Template for all required env vars
└── package.json
```

---

## 8. Database Schema Overview

### Models at a Glance

| Model             | Purpose                       | Key Relations                                                                          |
| ----------------- | ----------------------------- | -------------------------------------------------------------------------------------- |
| `User`            | Job seeker account            | → UserProfile, Subscription, Application[], SavedJob[], RefreshToken[], Notification[] |
| `UserProfile`     | Extended user info            | ← User                                                                                 |
| `Organization`    | Employer account              | → OrgProfile, Job[], HiringIncentive[], RefreshToken[]                                 |
| `OrgProfile`      | Company details               | ← Organization                                                                         |
| `Admin`           | Platform admin                | Standalone (no FK relations)                                                           |
| `RefreshToken`    | Active sessions               | → User OR Organization                                                                 |
| `PlanCatalogue`   | Subscription plan definitions | Standalone (Stripe IDs stored here)                                                    |
| `Subscription`    | User's current plan + usage   | → User                                                                                 |
| `Job`             | Job listings                  | → Organization, Application[], SavedJob[], DeletedJob?                                 |
| `DeletedJob`      | Soft-delete trash bin         | → Job (FK, cascade)                                                                    |
| `Application`     | Job applications              | → Job, User, HiringIncentive?                                                          |
| `SavedJob`        | Bookmarked jobs               | → User, Job                                                                            |
| `HiringIncentive` | $50 per hire                  | → Organization, Job, Application                                                       |
| `Payment`         | All payment records           | → User?, Organization?, Subscription?                                                  |
| `Notification`    | In-app notifications          | → User?, Organization?                                                                 |

### Key Constraints

- `Application`: unique on `[jobId, userId]` — one application per user per job
- `SavedJob`: unique on `[userId, jobId]`
- `HiringIncentive`: unique on `applicationId`
- `Job.slug`: globally unique
- `Subscription.stripeSubscriptionId`: unique
- `Payment.stripePaymentIntentId`, `.stripeInvoiceId`, `.stripeRefundId`: all
  unique

---

## 9. Authentication System

### Token Strategy

| Token                | Type                        | Expiry                | Storage                  |
| -------------------- | --------------------------- | --------------------- | ------------------------ |
| Access Token         | JWT (HS256) + JTI           | 15 minutes            | Memory + HttpOnly Cookie |
| Refresh Token        | JWT (hashed in DB)          | 7d / 30d (rememberMe) | HttpOnly Cookie + DB     |
| Email Verify Token   | SHA-256(crypto.randomBytes) | 24 hours              | DB                       |
| Password Reset Token | SHA-256(crypto.randomBytes) | 1 hour                | DB                       |
| 2FA Temp Token       | Short JWT                   | 5 minutes             | Redis                    |
| 2FA Secret           | TOTP base32 (otplib)        | Never                 | DB                       |

### Auth Flows

**Registration:** Validate → Hash password → Create User + Profile +
Subscription (transaction) → Queue verification email

**Login:** Find user → Compare bcrypt → Check isEmailVerified → Check 2FA →
Issue tokens → Set HttpOnly cookies

**Logout:** Blacklist JTI in Redis (TTL = remaining token lifetime) → Revoke
refresh token in DB

**Token Refresh:** Verify refresh JWT → Find in DB → Check not revoked → Rotate
(revoke old, issue new)

**2FA Login:** Login → issue temp token (5min Redis flag) → Client submits OTP →
Verify TOTP → Issue full tokens

### Security Measures

| Attack              | Mitigation                                             |
| ------------------- | ------------------------------------------------------ |
| Brute force login   | 5 attempts / 15 min per IP+email                       |
| Token theft         | Short-lived access tokens (15min) + JTI blacklisting   |
| CSRF                | SameSite=Strict cookies                                |
| XSS                 | HttpOnly cookies + Content-Security-Policy             |
| Email enumeration   | Generic messages on forgot-password                    |
| Refresh token theft | Rotation + suspicious activity detection → bulk revoke |
| Password stuffing   | bcrypt 12 rounds                                       |

---

## 10. Feature Gating System

Three middleware guards enforce plan-based access:

### `checkApplyLimit` (POST /applications)

- Loads user subscription + plan features from `PlanCatalogue`
- Auto-resets monthly counter if `applyCountResetAt < startOfMonth(today)`
- Blocks if `applyCountThisMonth >= applyMonthlyLimit` (FREE = 5, BASIC = 30,
  PREMIUM = unlimited)

### `checkJobPlan` (POST /applications)

- Loads `job.requiredPlan` and `user.subscription.plan`
- Compares using `PLAN_HIERARCHY = { FREE: 0, BASIC: 1, PREMIUM: 2 }`
- Blocks if user level < required level

### `checkSaveJobLimit` (POST /jobs/:id/save)

- Loads `savedJobCount` from subscription
- Blocks if at plan limit (FREE = 5, BASIC = 50, PREMIUM = unlimited)

### `checkOrgProfileAccess` (GET public org profiles)

- Checks `canViewOrgProfile` from plan features
- FREE users cannot see full company profiles

### Job Browse Limit (service layer — not middleware)

- FREE users see only `requiredPlan = 'FREE'` jobs, capped at 20
- Response `meta` includes
  `isLimited: true, limitMessage: "Upgrade to see all jobs"`

### `requireOrgReady` (all org job posting routes)

- Checks `isApproved`, `isPaymentMethodOnFile`, `hasUnpaidIncentives`
- Blocks with actionable error messages if any check fails

---

## 11. Real-Time System (Socket.IO)

### Room Structure

```
user:{userId}     — receives application status updates, notification badges
org:{orgId}       — receives new application alerts, incentive:created events
admin:{adminId}   — platform-level events (future)
```

### Auth: JWT verified on WebSocket handshake, JTI checked against Redis blacklist

### Events (server → client)

| Event                        | Target Room     | Trigger                        |
| ---------------------------- | --------------- | ------------------------------ |
| `application:new`            | `org:{orgId}`   | User applies to job            |
| `application:status_updated` | `user:{userId}` | Org updates application status |
| `application:withdrawn`      | `org:{orgId}`   | User withdraws application     |
| `incentive:created`          | `org:{orgId}`   | Org marks candidate as HIRED   |
| `notification:new`           | `user:{userId}` | Any new notification created   |

---

## 12. Background Job System (BullMQ)

All three workers use Redis as the queue backend and are registered on app
startup.

### Email Worker (`email.queue.ts` + `email.worker.ts`)

- Processes all transactional emails asynchronously
- Typed discriminated union payload (`EmailJobPayload`) — switch on
  `payload.name`
- 3 retry attempts with exponential backoff (3s → 9s → 27s)
- Concurrency: 5 simultaneous emails

### Subscription Reset (`subscription-reset.queue.ts`)

- Cron: `0 0 1 * *` — 00:00 UTC on the 1st of every month
- Resets `applyCountThisMonth = 0` for all non-FREE subscriptions

### Incentive Overdue (`incentive-overdue.worker.ts`)

- Cron: `30 2 * * *` — 02:30 UTC daily
- Marks PENDING incentives with `dueAt < now()` as OVERDUE
- Batch-recalculates `org.hasUnpaidIncentives` per affected org

### Job Cleanup (`job-cleanup.worker.ts`)

- Cron: `0 2 * * *` — 02:00 UTC daily
- Hard-deletes ARCHIVED job rows where `DeletedJob.deleteAt < now()`
- Cascade: removes Applications, SavedJobs, HiringIncentives

---

## 13. Stripe Integration

### Subscription Flow

```
User → POST /subscription/checkout → Stripe Checkout Session → redirect
Stripe → checkout.session.completed webhook → activate subscription in DB
Stripe → invoice.payment_succeeded → renew period, reset apply counter
Stripe → customer.subscription.deleted → downgrade to FREE
Stripe → invoice.payment_failed → mark PAST_DUE, send email
```

### Incentive Payment Flow

```
Org POST /org/incentives/:id/pay
  → stripe.paymentIntents.create (off-session, saved card)
  → Update HiringIncentive status = PAID
  → Create Payment record
  → Recalculate org.hasUnpaidIncentives
  → Send receipt email
```

### Plan Sync (Admin → Stripe)

```
Admin POST /admin/plans → stripe.products.create + stripe.prices.create → store IDs in PlanCatalogue
Admin PUT /admin/plans/:id (price change) → archive old Price + create new Price
Admin DELETE /admin/plans/:id → archive Stripe Product + Price → soft delete in DB
```

### Webhook Security

Raw body (`express.raw`) mounted before global JSON middleware. Signature
verified via `stripe.webhooks.constructEvent`.

---

## 14. Email System

### Template Engine

HTML files with `{{VARIABLE}}` placeholders. Globals auto-injected: `APP_NAME`,
`APP_URL`, `SUPPORT_EMAIL`, `YEAR`.

### 19 Email Templates

| Category      | Templates                                                                |
| ------------- | ------------------------------------------------------------------------ |
| Auth          | verify-email (user + org), reset-password, password-changed, 2fa-enabled |
| Applications  | submitted-user, submitted-org, status-update                             |
| Subscriptions | activated, cancelled, downgraded, payment-failed                         |
| Incentives    | due, paid, overdue, waived, dispute-received                             |
| Organization  | approved, rejected                                                       |

### Delivery

All emails are **never sent synchronously**. Always enqueued via
`enqueueEmail(payload)` → BullMQ → email worker → Nodemailer → Brevo SMTP.

---

## 15. API Endpoints Summary

### Auth (42 endpoints across 3 roles)

```
POST  /auth/user/register          POST  /auth/org/register          POST  /auth/admin/login
POST  /auth/user/login             POST  /auth/org/login             POST  /auth/admin/logout
POST  /auth/user/logout            POST  /auth/org/logout            POST  /auth/admin/refresh-token
POST  /auth/user/refresh-token     POST  /auth/org/refresh-token     GET   /auth/admin/me
GET   /auth/user/verify-email      GET   /auth/org/verify-email
POST  /auth/user/resend-verification
POST  /auth/user/forgot-password   POST  /auth/org/forgot-password
POST  /auth/user/reset-password    POST  /auth/org/reset-password
POST  /auth/user/2fa/setup         POST  /auth/org/2fa/setup
POST  /auth/user/2fa/verify        POST  /auth/org/2fa/verify
POST  /auth/user/2fa/validate      POST  /auth/org/2fa/validate
POST  /auth/user/2fa/disable       POST  /auth/org/2fa/disable
GET   /auth/user/me                GET   /auth/org/me
```

### User Profile & Jobs

```
GET    /user/profile               GET    /user/saved-jobs
PUT    /user/profile               POST   /user/jobs/:id/save
POST   /user/profile/avatar        DELETE /user/jobs/:id/save
POST   /user/profile/resume        GET    /jobs  (public search)
DELETE /user/profile/resume        GET    /jobs/categories
PUT    /user/change-password       GET    /jobs/:slug
DELETE /user/account
```

### Applications

```
POST   /applications               GET    /org/applications
GET    /applications               GET    /org/applications/:id
GET    /applications/:id           PATCH  /org/applications/:id/status
DELETE /applications/:id           GET    /org/jobs/:jobId/applications
```

### Organization

```
GET    /org/profile                GET    /org/jobs/deleted
PUT    /org/profile                POST   /org/jobs
POST   /org/profile/logo           GET    /org/jobs
GET    /org/billing                GET    /org/jobs/:id
POST   /org/billing/setup-intent   PUT    /org/jobs/:id
POST   /org/billing/payment-method DELETE /org/jobs/:id
DELETE /org/billing/payment-method PATCH  /org/jobs/:id/publish
GET    /org/incentives             PATCH  /org/jobs/:id/close
GET    /org/incentives/:id         PATCH  /org/jobs/:id/restore
POST   /org/incentives/:id/pay
POST   /org/incentives/:id/dispute
```

### Subscriptions

```
GET  /subscription/plans           POST /subscription/cancel
GET  /subscription/my              POST /subscription/reactivate
POST /subscription/checkout        GET  /subscription/invoices
POST /webhooks/stripe
```

### Notifications

```
GET   /notifications
PATCH /notifications/read-all
PATCH /notifications/:id/read
```

### Admin

```
GET   /admin/users                      GET    /admin/plans
GET   /admin/users/:id                  GET    /admin/plans/:id
PATCH /admin/users/:id/suspend          POST   /admin/plans
PATCH /admin/users/:id/activate         PUT    /admin/plans/:id
GET   /admin/organizations              PATCH  /admin/plans/:id/toggle
PATCH /admin/organizations/:id/approve  DELETE /admin/plans/:id
PATCH /admin/organizations/:id/suspend  GET    /admin/subscriptions
PATCH /admin/organizations/:id/activate GET    /admin/subscriptions/stats
GET   /admin/jobs                       GET    /admin/subscriptions/:id
PATCH /admin/jobs/:id/takedown          POST   /admin/subscriptions/:id/cancel
GET   /admin/incentives                 POST   /admin/subscriptions/:id/refund
GET   /admin/incentives/stats           GET    /admin/dashboard/stats
GET   /admin/incentives/:id
POST  /admin/incentives/:id/waive
POST  /admin/incentives/:id/resolve-dispute
```

---

## 16. Standard Response Format

### Success

```json
{
  "success": true,
  "message": "Resource action successful",
  "data": { "...": "..." },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email address" }]
}
```

### HTTP Status Codes Used

`200` OK · `201` Created · `204` No Content · `400` Bad Request · `401`
Unauthorized · `403` Forbidden · `404` Not Found · `409` Conflict · `422`
Unprocessable · `429` Too Many Requests · `500` Internal Error

---

## 17. Code Architecture Conventions

### Layer Responsibilities

```
Route → Middleware (validate, authenticate, authorize, rateLimiter, feature guards)
      → asyncHandler(Controller)   ← thin: extract from req, call service, send response
      → Service                    ← fat: all business logic, DB, Redis, emails, Socket emits
      → Response (sendSuccess / sendCreated / sendError)
```

### Error Handling

Services always throw typed errors. Never use `res.status().json()` from a
service.

```typescript
throw new ConflictError('Email already exists');
throw new UnauthorizedError('Invalid email or password');
throw new ForbiddenError('Please verify your email');
throw new NotFoundError('User not found');
throw new BadRequestError('Invalid or expired token');
```

### Code Style Rules

- TypeScript strict mode — no `any`
- `import type` for type-only imports
- Path aliases always (`@config/`, `@services/`, `@utils/`) — never relative
  `../../`
- Single quotes, trailing commas, 100-char line width (Prettier)
- `asyncHandler` wraps every async controller — unhandled promise rejections
  forward to global error handler
- Fire-and-forget async operations use `void fn()` explicitly

---

## 18. Environment Variables

```env
# Server
NODE_ENV=development | test | production
PORT=5000
API_VERSION=v1
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5000/api/v1
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...       # For Prisma migrations (not pooler)

# Redis
REDIS_URL=redis://localhost:6379  # Use rediss:// for Upstash

# JWT (min 32 chars each)
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_REFRESH_EXPIRY_REMEMBER_ME=30d

# Bcrypt
BCRYPT_ROUNDS=12

# Email (Brevo SMTP)
BREVO_SMTP_KEY=...
BREVO_SMTP_USER=...
MAIL_FROM_ADDRESS=noreply@careerarch.com
MAIL_FROM_NAME=CareerArch

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_INCENTIVE_AMOUNT=5000      # $50 in cents
STRIPE_CURRENCY=usd

# Cloudinary (file uploads)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# OAuth (planned — Phase 4)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOGIN_RATE_LIMIT_MAX=5

# Monitoring
SENTRY_DSN=https://...
```

---

## 19. Deployment Architecture

```
Push to main → GitHub Actions CI (lint → typecheck → test → build)
             → Trigger Render deploy via API (Docker build)
             → Render builds Dockerfile --target production
             → node dist/server.js

External services:
  Database  → Supabase PostgreSQL (direct connection port 5432)
  Redis     → Upstash (rediss:// TLS)
  Email     → Brevo SMTP relay
  Files     → Cloudinary
  Payments  → Stripe
  Errors    → Sentry
```

### Docker Build Stages

1. **deps** — Production node_modules only (`--ignore-scripts` skips husky)
2. **builder** — Full deps + `tsc` + `tsc-alias` (resolves path aliases in
   compiled JS)
3. **development** — ts-node + nodemon (local Docker dev)
4. **production** — Copies from deps + builder, runs as non-root user

---

## 20. Project Phase Status

| Phase      | Description                                                                 | Status         |
| ---------- | --------------------------------------------------------------------------- | -------------- |
| Phase 1    | Project structure, architecture design, documentation                       | ✅ Complete    |
| Phase 2    | Full auth for all 3 roles (JWT, 2FA, email, password reset)                 | ✅ Complete    |
| Phase 3A   | Org profile, billing (Stripe SetupIntent), admin org management             | ✅ Complete    |
| Phase 3B   | Job CRUD (org), soft delete trash, slug generation, HTML sanitization       | ✅ Complete    |
| Phase 3C   | User profile CRUD, avatar/resume upload (Cloudinary), admin user management | ✅ Complete    |
| Phase 3D   | Subscription plans (Stripe), feature gating, BullMQ monthly reset           | ✅ Complete    |
| Phase 3E   | Application flow, status pipeline, Socket.IO, public job search, saved jobs | ✅ Complete    |
| Phase 3F   | Hiring incentive system (pay, dispute, waive, overdue cron)                 | ✅ Complete    |
| Phase 3G   | Admin dashboard, admin jobs management, notifications, Stripe webhooks      | ✅ Complete    |
| Deployment | Docker, Render, Supabase, Upstash, GitHub Actions CI/CD                     | ✅ Complete    |
| Pending    | Integration tests (org auth, admin auth, jobs, applications)                | ⏳ Pending     |
| Pending    | Google OAuth + LinkedIn OAuth                                               | ⏳ Pending     |
| Phase 4    | Next.js 15 frontend (all dashboards)                                        | ⏳ Not started |
| Phase 5    | E2E tests, Playwright, Vercel frontend deployment                           | ⏳ Not started |

---
