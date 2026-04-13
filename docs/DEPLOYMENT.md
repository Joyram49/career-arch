# 🚀 Deployment Guide — CareerArch

> Backend is live at: **<https://career-arch.onrender.com>**

---

## Production Stack

```table
Frontend  → Vercel          (Next.js — planned)
Backend   → Render          (Docker, free tier)
Database  → Supabase        (PostgreSQL, free tier)
Redis     → Upstash         (free tier, 10k commands/day)
Email     → Brevo           (SMTP relay, 300 emails/day free)
Files     → AWS S3          (resume + avatar uploads)
Payments  → Stripe          (test/live keys)
Monitoring→ Sentry          (error tracking)
```

---

## Architecture Overview

```flow
User
 │
 ├──► https://careerarch.vercel.app        (Vercel — Next.js frontend)
 │         │
 │         └──► https://career-arch.onrender.com/api/v1  (Render — Express API)
 │                   │
 │                   ├──► Supabase PostgreSQL (db.[ref].supabase.co:5432)
 │                   ├──► Upstash Redis      (rediss://...upstash.io:6379)
 │                   ├──► Brevo SMTP         (smtp-relay.brevo.com:587)
 │                   ├──► AWS S3             (file uploads)
 │                   └──► Stripe             (payments)
```

---

## Environment Strategy

```highlight
.env.development   ← local dev (gitignored)
.env.production    ← production reference (gitignored, values go in Render)
.env.example       ← template committed to git
docker-compose.yml ← local infra only (postgres + redis + redis GUI)
```

### Local Development

- Backend + Frontend run on localhost (no Docker for app)
- PostgreSQL + Redis run in Docker containers
- Redis GUI (Redis Commander) at <http://localhost:8081>

### Production

- Backend runs in Docker on Render
- All env vars set in Render dashboard (not in files)
- No `.env` files on the server

---

## Local Infrastructure (Docker)

Start postgres + redis locally for development:

```bash
# Start all infrastructure
docker compose up -d

# Services available:
# PostgreSQL → localhost:5432
# Redis      → localhost:6379
# Redis GUI  → http://localhost:8081
```

`docker-compose.yml` runs only infrastructure — the API and frontend run with
`npm run dev` directly.

---

## Render Deployment (Backend)

### How It Works

Render pulls your GitHub repo, builds the Dockerfile (`production` target), and
runs the container. It manages the Docker image internally — you don't need to
push to Docker Hub.

```flowchart
Push to main branch
        │
        ▼
GitHub Actions CI runs (lint → test → build)
        │
        ▼ (all pass)
GitHub Actions triggers Render deploy via API
        │
        ▼
Render builds Dockerfile --target production
        │
        ▼
Container starts: node dist/server.js
        │
        ▼
Health check: GET /api/v1/health
```

### Render Setup Steps

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo (`Joyram49/career-arch`)
3. Set:
   - **Runtime:** Docker
   - **Branch:** main
   - **Dockerfile path:** `./Dockerfile`
4. Set all environment variables (see below)
5. Deploy

### Getting Render Secrets for GitHub Actions

- **RENDER_API_KEY:** Render dashboard → Account Settings → API Keys → Create
- **RENDER_SERVICE_ID:** From your service URL in the browser (format:
  `srv-xxxxxxxxxxxxxxxxx`)

### Free Tier Notes

- ⚠️ Service sleeps after **15 minutes** of inactivity
- ⚠️ Cold start takes ~30 seconds on first request after sleep
- ✅ 750 hours/month (enough for one service 24/7)
- ✅ Auto-deploy on every push to `main`

To keep it awake (optional): use [cron-job.org](https://cron-job.org) to ping
`/api/v1/health` every 10 minutes for free.

---

## Render Environment Variables

Set these in Render → your service → **Environment** tab:

```env
# Server
NODE_ENV=production
PORT=5000
API_VERSION=v1
FRONTEND_URL=https://your-frontend.vercel.app
API_URL=https://career-arch.onrender.com/api/v1
ALLOWED_ORIGINS=https://your-frontend.vercel.app

# Database — Supabase direct connection (NOT pooler URL)
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# Redis — Upstash TCP with TLS
REDIS_URL=rediss://default:[token]@destined-weasel-73749.upstash.io:6379

# JWT
JWT_ACCESS_SECRET=your-64-char-production-secret
JWT_REFRESH_SECRET=your-64-char-production-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_REFRESH_EXPIRY_REMEMBER_ME=30d

# Bcrypt
BCRYPT_ROUNDS=12

# Email — Brevo SMTP
BREVO_SMTP_KEY=your-brevo-smtp-key
BREVO_SMTP_USER=your-brevo-smtp-login
MAIL_FROM_ADDRESS=noreply@careerarch.com
MAIL_FROM_NAME=CareerArch

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BASIC_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_INCENTIVE_AMOUNT=5000
STRIPE_CURRENCY=usd

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=careerarch-prod-uploads

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://career-arch.onrender.com/api/v1/auth/google/callback
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOGIN_RATE_LIMIT_MAX=5

# Sentry
SENTRY_DSN=https://...@....ingest.sentry.io/...
```

---

## Supabase Setup

1. Go to [supabase.com](https://supabase.com) → New project
2. Settings → Database → Connection string
3. Use the **direct connection** (port `5432`) — NOT the connection pooler
4. Run migrations after first deploy:

```bash
# One-time: run migrations against Supabase
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Or via Render Shell (dashboard → Shell tab):

```bash
npx prisma migrate deploy
```

**Why direct connection?** Prisma migrations don't work with the connection
pooler (port 6543). The direct connection (port 5432) is required for
`prisma migrate deploy`.

---

## Upstash Redis Setup

1. Go to [upstash.com](https://upstash.com) → Create database
2. Select region closest to your Render server (US West)
3. Copy the **TCP URL** — format:
   `rediss://default:[token]@[endpoint].upstash.io:6379`

> Use `rediss://` (double s) — this is TLS encrypted, required by Upstash. Do
> NOT use the REST URL (`UPSTASH_REDIS_REST_URL`) — that's for HTTP clients, not
> ioredis.

---

## GitHub Actions CI/CD

### Secrets Required

Set in GitHub → Settings → Secrets → **Repository secrets**:

| Secret               | Purpose         | Where to get it                |
| -------------------- | --------------- | ------------------------------ |
| `JWT_ACCESS_SECRET`  | CI test runner  | Any 32+ char string            |
| `JWT_REFRESH_SECRET` | CI test runner  | Any 32+ char string            |
| `RENDER_API_KEY`     | Trigger deploys | Render → Account → API Keys    |
| `RENDER_SERVICE_ID`  | Target service  | Render service URL (`srv-xxx`) |
| `CODECOV_TOKEN`      | Coverage upload | codecov.io (optional)          |

> **Note:** `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in GitHub Secrets are
> only used by CI tests — they are separate from your production secrets stored
> in Render.

### Pipeline Flow

```flow
Push to main or PR
        │
        ├── Job 1: Lint & Type Check
        │   ├── npm ci
        │   ├── prisma generate
        │   ├── tsc --noEmit
        │   ├── eslint
        │   └── prettier --check
        │
        ├── Job 2: Tests (needs lint)
        │   ├── postgres:16 service container
        │   ├── redis:7 service container
        │   ├── prisma migrate deploy
        │   └── jest --ci --coverage --runInBand
        │
        ├── Job 3: Build (needs test)
        │   ├── tsc --project tsconfig.json
        │   └── tsc-alias -p tsconfig.json
        │
        └── Job 4: Deploy (needs build, main branch only)
            └── curl Render deploy API → triggers rebuild
```

---

## Docker Build Details

The `Dockerfile` uses a 4-stage multi-stage build:

```flow
Stage 1: deps
  └── npm ci --omit=dev --ignore-scripts
      (production deps only, skips husky/prepare)

Stage 2: builder
  └── npm ci (all deps)
  └── prisma generate
  └── tsc && tsc-alias
      (compiles TS + resolves path aliases)

Stage 3: development
  └── used for local docker dev only

Stage 4: production (final image)
  └── copies node_modules from deps stage
  └── copies dist/ from builder stage
  └── copies prisma/ schema
  └── runs as non-root user (careerarch:nodejs)
  └── CMD: node dist/server.js
```

### Key Build Decisions

| Decision                            | Reason                                                |
| ----------------------------------- | ----------------------------------------------------- |
| `--ignore-scripts` in deps stage    | Skips `prepare` (husky) in production install         |
| `husky \|\| true` in prepare script | Prevents CI failure when no `.git` folder             |
| `tsc-alias` in build script         | Resolves `@config/`, `@services/` etc. in compiled JS |
| Non-root user in production         | Security best practice                                |

---

## Vercel Deployment (Frontend — Planned)

1. Go to [vercel.com](https://vercel.com) → Import project → select frontend
   repo
2. Framework: Next.js (auto-detected)
3. Set environment variables:

```env
NEXT_PUBLIC_API_URL=https://career-arch.onrender.com/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret
```

1(4). Deploy — Vercel auto-deploys on every push to `main`

---

## Health Check

Verify your deployment is live:

```bash
curl https://career-arch.onrender.com/api/v1/health

# Expected response:
{
  "success": true,
  "message": "CareerArch API is running",
  "timestamp": "2026-04-13T...",
  "version": "1.0.0"
}
```

---

## Troubleshooting

| Error                              | Cause                     | Fix                                        |
| ---------------------------------- | ------------------------- | ------------------------------------------ |
| `Cannot find module '@config/...'` | tsc-alias not in build    | Add `tsc-alias` to build script            |
| `husky: not found` (exit 127)      | husky runs in Docker      | Use `--ignore-scripts` + `husky \|\| true` |
| `ECONNREFUSED redis`               | Wrong Redis URL format    | Use `rediss://` not `redis://` for Upstash |
| Prisma migration fails             | Using pooler URL          | Use direct connection port 5432, not 6543  |
| Cold start timeout                 | Render free tier sleeps   | Expected — use cron ping to keep alive     |
| Zod env validation fails           | Missing env var on Render | Check all vars are set in Render dashboard |
