# 🗺️ Project Roadmap & Progress Tracker — CareerArch

> Last Updated: Phase 2 Complete + Deployment Live

---

## ✅ Phase 1 — Structure & Documentation (DONE)

- [x] Project architecture designed
- [x] Tech stack finalized (Node/Express/PostgreSQL/Next.js)
- [x] Package list documented (backend + frontend)
- [x] Database schema (Prisma) designed
- [x] API contract documented (all endpoints)
- [x] Auth system design (flows, tokens, 2FA)
- [x] Subscription plan logic documented
- [x] Payment flows (Stripe) documented
- [x] Email events matrix + templates documented (Brevo SMTP)
- [x] Folder structure defined (backend + frontend)
- [x] .env.example created

---

## ✅ Phase 2 — Auth Backend APIs (DONE)

### User Auth

- [x] POST /auth/user/register
- [x] POST /auth/user/login
- [x] POST /auth/user/logout
- [x] POST /auth/user/refresh-token
- [x] GET /auth/user/verify-email
- [x] POST /auth/user/resend-verification
- [x] POST /auth/user/forgot-password
- [x] POST /auth/user/reset-password
- [x] POST /auth/user/2fa/setup
- [x] POST /auth/user/2fa/verify
- [x] POST /auth/user/2fa/disable
- [x] POST /auth/user/2fa/validate
- [x] GET /auth/user/me
- [ ] GET /auth/google (OAuth) — Phase 3
- [ ] GET /auth/linkedin (OAuth) — Phase 3

### Organization Auth

- [x] POST /auth/org/register
- [x] POST /auth/org/login
- [x] POST /auth/org/logout
- [x] POST /auth/org/refresh-token
- [x] GET /auth/org/verify-email
- [x] POST /auth/org/forgot-password
- [x] POST /auth/org/reset-password
- [x] POST /auth/org/2fa/setup
- [x] POST /auth/org/2fa/verify
- [x] POST /auth/org/2fa/validate
- [x] GET /auth/org/me

### Admin Auth

- [x] POST /auth/admin/login
- [x] POST /auth/admin/logout
- [x] POST /auth/admin/refresh-token
- [x] GET /auth/admin/me

---

## ✅ Deployment — Backend Live (DONE)

- [x] Docker multi-stage build configured (Dockerfile)
- [x] Husky disabled in Docker/CI via `husky || true` + `--ignore-scripts`
- [x] TypeScript path aliases resolved in production via `tsc-alias`
- [x] Backend deployed to Render (free tier)
- [x] PostgreSQL hosted on Supabase (free tier)
- [x] Redis hosted on Upstash (free tier, TCP `rediss://`)
- [x] CI/CD pipeline via GitHub Actions
- [x] Environment variables configured in Render dashboard
- [x] Health check endpoint live at `/api/v1/health`

**Live URLs:**

- API: <https://career-arch.onrender.com/api/v1>
- API Docs: <https://career-arch.onrender.com/api-docs>

---

## ⏳ Phase 3 — Core Backend APIs

### User

- [ ] GET/PUT /user/profile
- [ ] POST /user/profile/avatar
- [ ] POST /user/profile/resume
- [ ] PUT /user/change-password
- [ ] DELETE /user/account

### Jobs

- [ ] POST /org/jobs
- [ ] GET /org/jobs
- [ ] PUT /org/jobs/:id
- [ ] DELETE /org/jobs/:id
- [ ] PATCH /org/jobs/:id/publish
- [ ] PATCH /org/jobs/:id/close
- [ ] GET /jobs (public search with filters)
- [ ] GET /jobs/:slug (public detail)
- [ ] GET /jobs/categories
- [ ] GET /jobs/featured

### Applications

- [ ] POST /applications (with email trigger)
- [ ] GET /applications (user)
- [ ] GET /applications/:id
- [ ] DELETE /applications/:id (withdraw)
- [ ] PATCH /org/jobs/:id/applications/:appId (status change)
- [ ] POST /jobs/:id/save
- [ ] DELETE /jobs/:id/save
- [ ] GET /user/saved-jobs

### Subscriptions & Payments

- [ ] GET /subscription/plans
- [ ] GET /subscription/my
- [ ] POST /subscription/checkout (Stripe session)
- [ ] POST /subscription/cancel
- [ ] POST /subscription/reactivate
- [ ] POST /webhooks/stripe
- [ ] Subscription gating middleware
- [ ] Auto-assign FREE on register ✅ (done in auth)

### Incentives

- [ ] Auto-create HiringIncentive on HIRED status
- [ ] POST /org/incentives/:id/pay
- [ ] Stripe PaymentIntent for incentives

### Organization Dashboard

- [ ] GET/PUT /org/profile
- [ ] POST /org/profile/logo
- [ ] GET /org/dashboard/stats
- [ ] GET /org/applications
- [ ] GET /org/incentives

### Admin

- [ ] GET /admin/dashboard/stats
- [ ] GET/PATCH /admin/users (list, suspend, activate)
- [ ] GET/PATCH /admin/organizations (list, approve, suspend)
- [ ] GET/PATCH /admin/jobs (list, takedown)
- [ ] GET /admin/payments
- [ ] GET /admin/subscriptions
- [ ] GET/POST /admin/incentives (list, waive)

### Notifications

- [ ] GET /notifications
- [ ] PATCH /notifications/:id/read
- [ ] PATCH /notifications/read-all

### OAuth

- [ ] GET /auth/google
- [ ] GET /auth/linkedin

---

## ⏳ Phase 4 — Frontend Implementation

### Auth Pages

- [ ] Register (User + Org)
- [ ] Login (with 2FA flow)
- [ ] Forgot/Reset Password
- [ ] Email Verification page

### Public Pages

- [ ] Landing page
- [ ] Job Search (filters, pagination)
- [ ] Job Detail page
- [ ] Companies listing
- [ ] Pricing page

### User Dashboard

- [ ] Overview / stats
- [ ] My Applications (with status tracker)
- [ ] Saved Jobs
- [ ] Profile (with resume upload)
- [ ] Subscription management

### Organization Dashboard Front

- [ ] Overview / stats
- [ ] Job management (CRUD + rich text editor)
- [ ] Applications pipeline (Kanban/table)
- [ ] Incentives dashboard
- [ ] Company profile

### Admin Dashboard

- [ ] Platform stats
- [ ] User management
- [ ] Organization management (approval flow)
- [ ] Jobs moderation
- [ ] Payments & Subscriptions

---

## ⏳ Phase 5 — Testing, Optimization & Deployment (Frontend)

- [x] Unit tests — token utilities
- [x] Integration tests — user auth flow
- [ ] Integration tests — org auth flow
- [ ] Integration tests — admin auth flow
- [ ] Integration tests — jobs, applications
- [ ] E2E tests (Playwright)
- [x] GitHub Actions CI/CD pipeline
- [x] Backend production deployment (Render)
- [ ] Frontend production deployment (Vercel)
- [x] Monitoring setup (Sentry DSN configured)

---

## 📝 Notes & Decisions Log

| Date    | Decision                              | Reason                                                                 |
| ------- | ------------------------------------- | ---------------------------------------------------------------------- | ---------------------- | ------------------------------------------ | --- | ------------------------ |
| Phase 1 | PostgreSQL over MongoDB               | Relational data with complex joins (jobs, applications, subscriptions) |
| Phase 1 | Prisma over TypeORM                   | Better type inference, cleaner migrations                              |
| Phase 1 | BullMQ for emails                     | Async processing, retries, prevents blocking API responses             |
| Phase 1 | Separate User & Org models            | Different auth flows, fields, and business rules                       |
| Phase 1 | Subscription auto-assign FREE         | Seamless UX — users don't have to do anything extra                    |
| Phase 1 | Fixed $50 incentive                   | Simple, predictable, easy to implement                                 |
| Phase 1 | Brevo (SMTP) over SendGrid            | Better free tier, reliable SMTP relay, Nodemailer compatible           |
| Phase 2 | tsc-alias for path resolution         | TypeScript @aliases don't resolve in compiled JS without it            |
| Phase 2 | husky                                 |                                                                        | true in prepare script | Husky fails in Docker/CI (no .git folder), |     | true prevents build fail |
| Phase 2 | --ignore-scripts in deps Docker stage | Skips prepare/postinstall lifecycle scripts in production install      |
| Deploy  | Render over Railway                   | Railway trial expired, Render has active free tier                     |
| Deploy  | Supabase for PostgreSQL               | Free tier, 500MB, Prisma compatible direct connection                  |
| Deploy  | Upstash for Redis                     | Free tier, 10k commands/day, TLS rediss:// for ioredis                 |
| Deploy  | Vercel for frontend (planned)         | Best Next.js support, free tier, auto-deploy from GitHub               |
