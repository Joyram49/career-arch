# 🚀 Backend Setup Guide — CareerArch

## Prerequisites

| Tool       | Version           |
| ---------- | ----------------- |
| Node.js    | v20 LTS or higher |
| npm        | v10 or higher     |
| PostgreSQL | v16               |
| Redis      | v7                |
| Git        | latest            |

---

## 1. Clone & Install

```bash
git clone https://github.com/your-org/careerarch-backend.git
cd careerarch-backend

npm install
```

---

## 2. Environment Setup

```bash
cp .env.example .env
```

Open `.env` and fill in your values. Minimum required for local dev:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/careerarch_db
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-secret-at-least-32-characters-long
JWT_REFRESH_SECRET=your-other-secret-at-least-32-chars
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5000/api/v1
BREVO_SMTP_KEY=
BREVO_SMTP_USER=
MAIL_FROM_ADDRESS=noreply@careerarch.com
STRIPE_SECRET_KEY=sk_test_xxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
STRIPE_BASIC_PRICE_ID=price_xxxx
STRIPE_PREMIUM_PRICE_ID=price_xxxx
AWS_ACCESS_KEY_ID=xxxx
AWS_SECRET_ACCESS_KEY=xxxx
AWS_S3_BUCKET=careerarch-uploads
GOOGLE_CLIENT_ID=xxxx
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback
LINKEDIN_CLIENT_ID=xxxx
LINKEDIN_CLIENT_SECRET=xxxx
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 3. Start Database Services

### Option A: Docker (recommended)

```bash
# Start only PostgreSQL + Redis (not the API)
docker compose up postgres redis -d
```

### Option B: Local install

Make sure PostgreSQL and Redis are running locally on their default ports.

---

## 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (creates all tables)
npm run db:migrate

# Seed initial data (admin + demo users)
npm run db:seed
```

After seeding, these accounts are available:

| Role         | Email                   | Password     |
| ------------ | ----------------------- | ------------ |
| Admin        | admin@careerarch.com    | Admin@123456 |
| User         | demo@careerarch.com     | User@123456  |
| Organization | techcorp@careerarch.com | Org@123456   |

---

## 5. Initialize Husky Git Hooks

```bash
npm run prepare
```

This sets up:

- **pre-commit**: ESLint + Prettier on staged files
- **commit-msg**: Enforces Conventional Commits format
- **pre-push**: TypeScript check + full test suite

---

## 6. Start Development Server

```bash
npm run dev
```

Server starts at: `http://localhost:5000` API Docs (Swagger):
`http://localhost:5000/api-docs`

---

## 7. Available Scripts

| Command                 | Description                     |
| ----------------------- | ------------------------------- |
| `npm run dev`           | Start with nodemon (hot reload) |
| `npm run build`         | Compile TypeScript to `dist/`   |
| `npm start`             | Run compiled production build   |
| `npm run typecheck`     | TypeScript check (no emit)      |
| `npm run lint`          | ESLint check                    |
| `npm run lint:fix`      | ESLint auto-fix                 |
| `npm run format`        | Prettier format all files       |
| `npm run format:check`  | Check formatting                |
| `npm test`              | Run tests                       |
| `npm run test:watch`    | Watch mode tests                |
| `npm run test:coverage` | Tests with coverage report      |
| `npm run db:generate`   | Regenerate Prisma client        |
| `npm run db:migrate`    | Run pending migrations          |
| `npm run db:studio`     | Open Prisma Studio (GUI)        |
| `npm run db:seed`       | Seed the database               |
| `npm run db:reset`      | Reset + re-migrate DB           |

---

## 8. Commit Message Format

This project uses **Conventional Commits**. Your commit messages must follow
this format:

```
<type>(<scope>): <description>

Examples:
  feat(auth): add refresh token rotation
  fix(jobs): resolve duplicate application bug
  docs: update API contract
  test(auth): add 2FA validation tests
  chore: update dependencies
```

**Types:** `feat` `fix` `docs` `style` `refactor` `test` `chore` `perf` `ci`
`build` `revert`

---

## 9. Project Structure at a Glance

```
src/
├── config/       # DB, Redis, Stripe, Email, Logger, Env
├── controllers/  # Request handlers (thin layer)
│   └── auth/     # user, org, admin auth controllers
├── middlewares/  # authenticate, authorize, validate, rateLimiter, errorHandler
├── routes/       # Express routers
├── services/     # Business logic (fat layer)
├── templates/    # HTML email templates
├── types/        # TypeScript interfaces
├── utils/        # apiError, apiResponse, asyncHandler, token, constants
├── validations/  # Zod schemas
├── app.ts        # Express app setup
├── server.ts     # HTTP server + graceful shutdown
└── swagger.ts    # Swagger/OpenAPI setup
```

---

## 10. Auth API Quick Reference

| Method | Endpoint                                | Auth    | Description         |
| ------ | --------------------------------------- | ------- | ------------------- |
| POST   | `/api/v1/auth/user/register`            | ❌      | Register user       |
| POST   | `/api/v1/auth/user/login`               | ❌      | Login user          |
| POST   | `/api/v1/auth/user/logout`              | ❌      | Logout              |
| POST   | `/api/v1/auth/user/refresh-token`       | ❌      | Refresh tokens      |
| GET    | `/api/v1/auth/user/verify-email?token=` | ❌      | Verify email        |
| POST   | `/api/v1/auth/user/resend-verification` | ❌      | Resend verification |
| POST   | `/api/v1/auth/user/forgot-password`     | ❌      | Send reset link     |
| POST   | `/api/v1/auth/user/reset-password`      | ❌      | Reset password      |
| POST   | `/api/v1/auth/user/2fa/validate`        | ❌      | Complete 2FA login  |
| GET    | `/api/v1/auth/user/me`                  | ✅ USER | Get profile         |
| POST   | `/api/v1/auth/user/2fa/setup`           | ✅ USER | Setup 2FA           |
| POST   | `/api/v1/auth/user/2fa/verify`          | ✅ USER | Enable 2FA          |
| POST   | `/api/v1/auth/user/2fa/disable`         | ✅ USER | Disable 2FA         |
| POST   | `/api/v1/auth/org/register`             | ❌      | Register org        |
| POST   | `/api/v1/auth/org/login`                | ❌      | Login org           |
| POST   | `/api/v1/auth/admin/login`              | ❌      | Login admin         |

---

## Phase Progress

- ✅ Phase 1 — Project Structure & Documentation
- ✅ Phase 2 — Auth Backend APIs _(current)_
- ⏳ Phase 3 — Core Backend APIs (Jobs, Applications, Subscriptions)
- ⏳ Phase 4 — Frontend
- ⏳ Phase 5 — Testing & Deployment
