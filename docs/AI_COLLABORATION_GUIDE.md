# 🤝 AI Collaboration & Project Handoff Guide — CareerArch

> **Purpose:** This document lets any developer — on any machine — instantly
> sync with the CareerArch project history, workflow decisions, and AI
> collaboration conventions. Paste the contents of this file plus the `docs/`
> folder context into Claude at the start of a new session.

---

## 📌 What Is This Project?

**CareerArch** is a production-grade, full-stack job portal platform inspired by
Glassdoor. It is built with:

- **Backend:** Node.js v20 + Express 5 + TypeScript + PostgreSQL 16 + Prisma 7
- **Cache/Queue:** Redis (ioredis) + BullMQ
- **Auth:** JWT (access + refresh tokens) + 2FA (TOTP via otplib) + bcrypt
- **Payments:** Stripe (subscriptions + one-time PaymentIntents)
- **Email:** Nodemailer + Brevo SMTP
- **Validation:** Zod 4
- **Testing:** Jest + Supertest
- **CI/CD:** GitHub Actions
- **Containerization:** Docker + Docker Compose

**Three user roles:**

| Role            | Description                                                       |
| --------------- | ----------------------------------------------------------------- |
| `USER` (Talent) | Searches jobs, applies, tracks applications, manages subscription |
| `ORGANIZATION`  | Posts jobs, manages hiring pipeline, pays $50 incentive per hire  |
| `ADMIN`         | Platform super-user — approves orgs, manages everything           |

**Three subscription plans (User only):**

| Plan    | Price     | Key Unlock                                        |
| ------- | --------- | ------------------------------------------------- |
| FREE    | $0        | Apply to Free-tier jobs only, 10 apps/month       |
| BASIC   | $9.99/mo  | Apply to Basic + Free jobs, 50 apps/month         |
| PREMIUM | $24.99/mo | Apply to all jobs, unlimited apps, AI resume tips |

**Hiring incentive:** When an org marks a candidate as `HIRED`, the platform
auto-creates a `HiringIncentive` record for $50. The org must pay within 7 days
via Stripe PaymentIntent.

**GitHub repo:** <https://github.com/Joyram49/career-arch>

---

## 🗺️ Project Phase Progress

### ✅ Phase 1 — Structure & Documentation (COMPLETE)

- Project architecture designed
- Tech stack finalized
- Full Prisma schema written (all models)
- API contract documented (all endpoints)
- Auth system design documented (flows, tokens, 2FA)
- Subscription and payment flows documented
- Email templates matrix documented
- Folder structure defined
- `.env.example` and `SETUP.md` created

### ✅ Phase 2 — Auth Backend APIs (COMPLETE)

All three roles (User, Organization, Admin) have full auth:

- Register → email verification → login
- Access token (JWT, 15 min) + refresh token (UUID hashed in DB, 7d / 30d)
- Token refresh with rotation (old token revoked, new issued)
- Logout with Redis blacklisting of JTI
- Forgot password → reset password (crypto token, 1h expiry, hashed in DB)
- 2FA setup (TOTP via otplib + QR code via qrcode)
- 2FA verify + enable, 2FA disable (requires password + OTP)
- 2FA login flow (temp token → OTP → full tokens)
- Remember Me (30-day refresh token)
- Resend verification email
- Rate limiting: login (5/15min), register (10/15min), forgot-password (3/15min)
- RBAC middleware (`authenticate` + `authorize`)
- Zod validation middleware on all routes
- Global error handler (ApiError, JWT errors, Prisma errors, SyntaxError)
- Integration tests: user auth flows fully tested
- Unit tests: token utilities fully tested
- GitHub Actions CI: lint → typecheck → test → build pipeline

### 🔄 Phase 2 — Still Being Discussed / Clarified

The following topics were discussed in depth and are now fully understood:

- **Rate limiter internals:** `express-rate-limit` uses in-memory store by
  default. Keyed by IP (general) or IP+email (login). Counters reset on server
  restart. Redis-backed store (`rate-limit-redis`) is only needed when scaling
  to multiple Node.js instances.

- **Why Redis and rate limiter are separate:** Rate limiter handles traffic
  volume control (HTTP middleware layer). Redis handles application state
  (blacklisted JTIs, 2FA temp tokens). They solve different problems and should
  remain independent layers.

- **When to use each:**
  - Rate limiter = "too many requests" threat (brute force, spam)
  - Redis = "token misuse after issuance" threat (replay, hijacking)

- **Best practice confirmed:** Keep them separate (current approach) until you
  need horizontal scaling, at which point add `rate-limit-redis` as the store
  for `express-rate-limit`.

### ⏳ Phase 3 — Core Backend APIs (NEXT — NOT STARTED)

Planned sub-phases in build order:

1. **3A — Jobs** (Org CRUD + public search + slug + view counter)
2. **3B — User Profile** (GET/PUT + avatar/resume upload to S3)
3. **3C — Applications** (apply with plan gating + status pipeline +
   auto-incentive on HIRED)
4. **3D — Subscriptions + Stripe Checkout** (checkout session + webhooks)
5. **3E — Hiring Incentives + Stripe PaymentIntent** (pay incentive + webhook)
6. **3F — Notifications** (create on key events + mark read)
7. **3G — Admin APIs** (stats + user/org management + approval + moderation)

### ⏳ Phase 4 — Frontend (NOT STARTED)

Next.js 14 App Router + Tailwind + shadcn/ui + TanStack Query + Zustand.

### ⏳ Phase 5 — Testing, Optimization & Deployment (NOT STARTED)

E2E tests, CI/CD finalization, Railway/Render + Vercel deployment.

---

## 🧠 Architecture Decisions Log

These decisions were made deliberately — do not change them without discussion:

| Decision                            | What                                                              | Why                                                                  |
| ----------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| Separate User & Organization models | Two Prisma models, not one `users` table with a role flag         | Different fields, different auth flows, different business rules     |
| Hashed tokens in DB                 | `emailVerifyToken`, `passwordResetToken` stored as SHA-256 hashes | Raw token only travels in email link, never stored plain             |
| JTI blacklist in Redis              | Logout adds `jti` to Redis with TTL = remaining token lifetime    | Stateless JWT becomes revocable without DB query on every request    |
| Refresh token rotation              | Each refresh revokes old token, issues new one                    | Detects token theft — if stolen token is used, all tokens revoked    |
| Separate refresh token table        | `RefreshToken` model in Prisma, not stored in User row            | Supports multiple sessions (devices), easy bulk revoke               |
| In-memory rate limiter              | `express-rate-limit` default store, not Redis-backed              | Sufficient for single-instance; swap to Redis store when scaling     |
| Rate limiter skipped in tests       | `skip: () => NODE_ENV === 'test'`                                 | Prevents test flakiness from rate limit state leaking between tests  |
| 2FA temp token in Redis             | Short-lived (5min) flag keyed by userId                           | Confirms OTP submission belongs to an active 2FA login flow          |
| Transaction for registration        | `prisma.$transaction` creates User + UserProfile + Subscription   | Atomic — no partial user records if anything fails                   |
| Email outside transaction           | `sendVerificationEmail` called after transaction commits          | Email failure doesn't roll back user creation                        |
| `asyncHandler` wrapper              | Wraps every async controller                                      | Catches unhandled promise rejections, passes to global error handler |
| Generic error messages              | "Invalid email or password" (not "user not found")                | Prevents user enumeration attacks                                    |
| Generic forgot-password response    | Same message whether email exists or not                          | Prevents email enumeration                                           |

---

## 📁 Project Structure

```
career-arch/
├── src/
│   ├── app.ts                    # Express app (middleware stack)
│   ├── server.ts                 # HTTP server + graceful shutdown
│   ├── swagger.ts                # Swagger/OpenAPI setup
│   ├── config/
│   │   ├── database.ts           # Prisma client (PrismaPg adapter)
│   │   ├── redis.ts              # ioredis singleton + RedisKeys + RedisExpiry
│   │   ├── email.ts              # Nodemailer transporter (Brevo SMTP)
│   │   ├── stripe.ts             # Stripe SDK init
│   │   ├── env.ts                # Zod-validated env (process exits on invalid)
│   │   └── logger.ts             # Winston + daily rotate file + Morgan stream
│   ├── controllers/auth/
│   │   ├── user.auth.controller.ts
│   │   ├── org.auth.controller.ts
│   │   └── admin.auth.controller.ts
│   ├── services/
│   │   ├── user.auth.service.ts  # All user auth business logic
│   │   ├── org.auth.service.ts   # All org auth business logic
│   │   ├── admin.auth.service.ts # All admin auth business logic
│   │   └── email.service.ts      # Template loader + specific email senders
│   ├── middlewares/
│   │   ├── authenticate.ts       # JWT verify + Redis blacklist check
│   │   ├── authorize.ts          # RBAC role check
│   │   ├── validate.ts           # Zod schema middleware factory
│   │   ├── rateLimiter.ts        # express-rate-limit configs per route type
│   │   └── errorHandler.ts       # Global error handler + 404 handler
│   ├── routes/
│   │   ├── index.ts              # Main router (mounts all sub-routers)
│   │   └── auth/
│   │       ├── auth.user.routes.ts
│   │       ├── auth.org.routes.ts
│   │       └── auth.admin.routes.ts
│   ├── validations/
│   │   └── auth.validation.ts    # All Zod schemas for auth endpoints
│   ├── utils/
│   │   ├── token.ts              # JWT generate/verify + crypto helpers
│   │   ├── apiError.ts           # Custom error classes (ApiError hierarchy)
│   │   ├── apiResponse.ts        # sendSuccess / sendCreated / sendError
│   │   ├── asyncHandler.ts       # Wraps async controllers
│   │   ├── constants.ts          # Cookie names, token expiry, rate limits, etc.
│   │   └── pagination.ts         # parsePagination + buildPaginationMeta
│   ├── types/index.ts            # IJwtPayload, IApiResponse, IUserAuthResponse, etc.
│   └── templates/emails/         # HTML email templates ({{VARIABLE}} placeholders)
├── prisma/
│   ├── schema.prisma             # Full schema (all models defined)
│   ├── migrations/               # Migration history
│   └── seed.ts                   # Seeds admin + demo user + demo org
├── docs/                         # Project documentation (the mental model)
│   ├── README.md
│   ├── AUTH_DESIGN.md
│   ├── API_CONTRACT.md
│   ├── DATABASE_SCHEMA.md
│   ├── TECH_STACK.md
│   ├── SUBSCRIPTION_PLAN.md
│   ├── EMAIL_TEMPLATES.md
│   ├── FOLDER_STRUCTURE.md
│   └── ROADMAP.md
├── .github/workflows/ci.yml      # Lint → Test → Build pipeline
├── docker-compose.yml            # PostgreSQL 16 + Redis 7 (local dev)
├── Dockerfile                    # Multi-stage: deps / builder / dev / production
├── SETUP.md                      # Local setup instructions
└── AI_COLLABORATION_GUIDE.md     # This file
```

---

## 🔑 Key Patterns & Conventions

Every person working on this project — human or AI assistant — must follow these
patterns. They are non-negotiable:

### Code Style

- **TypeScript strict mode** — all `strict` flags enabled in `tsconfig.json`
- **No `any`** — ESLint enforces `@typescript-eslint/no-explicit-any: error`
- **Explicit return types** on all functions
- **`import type`** for type-only imports (`consistent-type-imports`)
- **Path aliases** — use `@config/`, `@services/`, `@utils/`, etc. Never
  relative `../../`
- **Prettier** — single quotes, trailing commas, 100 char line width

### Architecture Layers

```
Route → Middleware (validate, authenticate, authorize, rateLimiter)
      → asyncHandler(Controller)
      → Service (all business logic, DB, Redis, email)
      → Response (sendSuccess / sendCreated / sendError)
```

Controllers are thin — they extract from `req`, call service, send response.
Services are fat — they own all business logic, DB queries, Redis ops, emails.

### Error Handling

Always throw typed errors from services:

```typescript
throw new ConflictError('An account with this email already exists');
throw new UnauthorizedError('Invalid email or password');
throw new BadRequestError('Invalid or expired token');
throw new NotFoundError('User not found');
throw new ForbiddenError('Please verify your email before logging in.');
```

Never `res.status().json()` directly in services. The global `errorHandler`
catches everything.

### Response Format (always consistent)

```json
// Success
{ "success": true, "message": "...", "data": { ... }, "meta": { ... } }

// Error
{ "success": false, "message": "...", "errors": [{ "field": "email", "message": "..." }] }
```

### Commit Messages (enforced by Husky commit-msg hook)

```
<type>(<scope>): <description>

feat(auth): add refresh token rotation
fix(jobs): resolve duplicate application bug
docs: update API contract for subscriptions
test(auth): add 2FA validation tests
chore: update dependencies
```

Allowed types: `feat` `fix` `docs` `style` `refactor` `test` `chore` `perf` `ci`
`build` `revert`

### Environment Files

| File               | Purpose                                     |
| ------------------ | ------------------------------------------- |
| `.env.development` | Local dev values                            |
| `.env.test`        | Test DB + Redis DB 1, low bcrypt rounds (4) |
| `.env.docker`      | Overrides for Docker (container hostnames)  |
| `.env.production`  | Production secrets (never commit)           |

All are validated by `src/config/env.ts` using Zod on startup. The process exits
with a clear error list if any variable is missing or invalid.

---

## 🤖 How to Use This Guide With an AI Assistant (Claude)

### Starting a New Session

When you open a new conversation with Claude and want to work on CareerArch,
paste this prompt at the start:

---

**PASTE THIS INTO CLAUDE AT THE START OF EVERY NEW SESSION:**

```
I am working on CareerArch — a production-grade Glassdoor-clone job portal.

GitHub repo: https://github.com/Joyram49/career-arch

Please read the AI_COLLABORATION_GUIDE.md from the repo docs to understand
the full project context before we proceed. Key facts:

- Tech stack: Node.js v20 + Express 5 + TypeScript + PostgreSQL 16 + Prisma 7
  + Redis + BullMQ + Zod 4 + Stripe + JWT auth
- Three roles: USER (talent), ORGANIZATION (employer), ADMIN
- Three subscription plans: FREE, BASIC ($9.99), PREMIUM ($24.99)
- Orgs pay $50 hiring incentive per successful hire via Stripe

Current status:
- Phase 1 (Structure & Docs): COMPLETE
- Phase 2 (Auth APIs): COMPLETE — all three roles have full auth
- Phase 3 (Jobs, Applications, Subscriptions, Payments): IN PROGRESS / NEXT

Key workflow rules:
1. Always check the docs/ folder before making architectural decisions
2. Before changing any workflow pattern, update the relevant doc file first
3. Follow the existing code conventions exactly (see AI_COLLABORATION_GUIDE.md)
4. The docs/ folder is the project's core mental model — keep it in sync

Today I want to work on: [DESCRIBE YOUR TASK HERE]
```

---

### Sharing the Full Codebase Context

For the AI to give accurate code, share the relevant files from your project.
The most important files to share for context are:

**Always share (core context):**

- `AI_COLLABORATION_GUIDE.md` (this file)
- `prisma/schema.prisma` (the data model)
- `src/types/index.ts` (TypeScript interfaces)
- `src/utils/constants.ts` (shared constants)
- `src/utils/apiError.ts` (error classes)
- `src/utils/apiResponse.ts` (response helpers)

**Share when working on auth:**

- `src/services/user.auth.service.ts`
- `src/middlewares/authenticate.ts`
- `src/middlewares/authorize.ts`
- `src/validations/auth.validation.ts`

**Share when working on a new feature:**

- The existing service file most similar to what you're building
- The existing route file most similar to what you're building
- `src/routes/index.ts` (so Claude knows how to mount the new router)
- `src/config/redis.ts` (if Redis keys are involved)

### How to Ask Claude for New Code

Be specific about what you want. Good examples:

```
"Write the job.validation.ts Zod schemas following the same pattern as
auth.validation.ts. It needs schemas for: createJob, updateJob, publishJob,
and searchJobs (with query params for keyword, location, type, etc.)"

"Write the job.service.ts for Phase 3A. It needs: createJob (org only, slug
generation), updateJob, deleteJob, publishJob (DRAFT → PUBLISHED), closeJob,
getOrgJobs (paginated), getPublicJobs (paginated search with filters),
getSingleJob (by slug, increments view count). Follow the exact patterns from
user.auth.service.ts — same error classes, same Prisma patterns, same style."
```

### Rules the AI Must Follow in This Project

Share this with Claude if it starts deviating from patterns:

1. **Never use relative imports.** Always use path aliases (`@services/`,
   `@config/`, `@utils/`, etc.)
2. **Never put business logic in controllers.** Controllers only extract from
   `req`, call a service, call a response helper.
3. **Always throw named error classes** (`ConflictError`, `NotFoundError`, etc.)
   never `res.status().json()` from services.
4. **Never hardcode strings** that belong in `constants.ts` (cookie names,
   expiry values, plan names, etc.)
5. **Always update the relevant `docs/` file** if a new pattern or workflow is
   introduced.
6. **Always add the new route to `src/routes/index.ts`** when creating a new
   router.
7. **Always add Zod validation schema** to the relevant validation file before
   writing the controller.
8. **Never expose sensitive data in responses** — map DB models to response
   interfaces (`IUserAuthResponse`, `IOrgAuthResponse`, etc.)

---

## 📡 API Base URL Pattern

```
Development:  http://localhost:5000/api/v1
Production:   https://api.careerarch.com/api/v1
Swagger docs: http://localhost:5000/api-docs (dev only)
```

All routes are prefixed `/api/v1` in `src/routes/index.ts`.

---

## 🗄️ Database Quick Reference

**Connection:** PostgreSQL 16 via Prisma 7 with `@prisma/adapter-pg` (native
PostgreSQL adapter, not the default Node.js driver).

**Key relationships:**

```
User ──── UserProfile (1:1, cascade delete)
User ──── Subscription (1:1, cascade delete)
User ──── Application[] (1:many)
User ──── RefreshToken[] (1:many)
User ──── SavedJob[] (1:many)

Organization ──── OrgProfile (1:1, cascade delete)
Organization ──── Job[] (1:many)
Organization ──── RefreshToken[] (1:many)
Organization ──── HiringIncentive[] (1:many)

Job ──── Application[] (1:many)
Application ──── HiringIncentive (1:1, unique)
```

**Important constraints:**

- `Application`: unique on `[jobId, userId]` — one application per user per job
- `SavedJob`: unique on `[userId, jobId]`
- `HiringIncentive`: unique on `applicationId`
- `Job.slug`: globally unique

**Enums:** `Role`, `SubscriptionPlan`, `SubscriptionStatus`, `JobStatus`,
`JobType`, `ApplicationStatus`, `IncentiveStatus`, `PaymentStatus`

---

## 🔐 Auth Quick Reference

**Token flow:**

```
Login → access_token (JWT, 15min, HttpOnly cookie + Authorization header)
      + refresh_token (UUID, hashed in DB, 7d / 30d, HttpOnly cookie only)

Access token expired → POST /auth/user/refresh-token (reads cookie)
                     → new access_token + rotated refresh_token

Logout → JTI added to Redis blacklist (TTL = remaining access token lifetime)
       → refresh_token revoked in DB
```

**2FA flow:**

```
Login (2FA enabled) → { requires2FA: true, tempToken: "short JWT 5min" }
                    → POST /auth/user/2fa/validate { tempToken, otp }
                    → { accessToken, refreshToken } (full auth cookies set)
```

**Redis keys used in auth:**

```typescript
RedisKeys.blacklistToken(jti); // "blacklist:token:<jti>"
RedisKeys.twoFaTempToken(userId); // "2fa:temp:<userId>"
```

---

## 📧 Email Templates

HTML templates live in `src/templates/emails/`. Variables use `{{VARIABLE}}`
syntax. Template loader is in `src/services/email.service.ts`.

Globals automatically replaced in every template: `{{APP_NAME}}`, `{{APP_URL}}`,
`{{SUPPORT_EMAIL}}`, `{{YEAR}}`

Existing templates: `verify-email.html`, `verify-email-org.html`,
`reset-password.html`, `password-changed.html`, `2fa-enabled.html`

Templates still needed (Phase 3): `application-submitted-user.html`,
`application-submitted-org.html`, `application-status-update.html`,
`subscription-activated.html`, `incentive-due.html`, `org-approved.html`

---

## 🧪 Testing Conventions

- **Framework:** Jest + Supertest
- **Test location:** `src/tests/unit/` and `src/tests/integration/`
- **Email mocked:** `jest.mock('@services/email.service')` in `setupTests.ts`
- **Rate limiting skipped:** `skip: () => NODE_ENV === 'test'`
- **Low bcrypt rounds in tests:** `BCRYPT_ROUNDS=4` (fast hashing)
- **Separate Redis DB:** `redis://localhost:6379/1` (DB index 1, not 0)
- **Test DB cleanup:** `afterEach` deletes test records in dependency order
  (Subscription → RefreshToken → UserProfile → User)

Run tests:

```bash
npm test                 # run all tests
npm run test:watch       # watch mode
npm run test:coverage    # with coverage report
npm run test:ci          # CI mode (coverage + runInBand)
```

---

## 🚀 Local Dev Quick Start

```bash
# 1. Clone
git clone https://github.com/Joyram49/career-arch.git
cd career-arch

# 2. Install
npm install

# 3. Environment
cp .env.example .env.development
# Fill in DATABASE_URL, REDIS_URL, JWT secrets (min 32 chars each)
# Stripe, AWS, OAuth keys can be placeholder values for local auth dev

# 4. Start infrastructure
docker compose up postgres redis -d

# 5. Database
npm run db:generate
npm run db:migrate
npm run db:seed

# 6. Git hooks
npm run prepare

# 7. Run
npm run dev
# → http://localhost:5000
# → http://localhost:5000/api-docs (Swagger)
```

**Seeded accounts:**

| Role         | Email                     | Password     |
| ------------ | ------------------------- | ------------ |
| Admin        | <admin@careerarch.com>    | Admin@123456 |
| User         | <demo@careerarch.com>     | User@123456  |
| Organization | <techcorp@careerarch.com> | Org@123456   |

---

## 📝 Notes for the Next Developer

- The `docs/` folder is the **single source of truth** for architecture
  decisions, API contracts, and workflow conventions. Always read it first,
  always update it when something changes.
- The project owner (Joyram49) has established strong conventions through Phases
  1 and 2. Match them exactly — same error classes, same response helpers, same
  service/controller split, same path aliases.
- When in doubt about a pattern, look at `src/services/user.auth.service.ts` —
  it is the most complete service file and the canonical reference.
- The Prisma schema already has all models defined for Phases 3–5. You are
  implementing services and routes against an existing schema, not designing new
  models (unless a gap is discovered).
- OAuth (Google + LinkedIn) for User is planned but not implemented. It is
  listed in the API contract but was deferred after Phase 2 core auth was done.
- The `savedBy` relation on `SavedJob` is missing a foreign key to `User` in the
  schema (`userId` field exists but no `user` relation defined). This needs to
  be added before implementing saved jobs in Phase 3C.

---

_Last updated: Phase 2 complete. Phase 3 not yet started._ _Maintained by:
Joyram49 (Joy Ram Das)_ _Repo: <https://github.com/Joyram49/career-arch>_
