# 🗺️ Project Roadmap & Progress Tracker — CareerArch

> Last Updated: Phase 1 Complete

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
- [x] Email events matrix + templates documented
- [x] Folder structure defined (backend + frontend)
- [x] .env.example created

---

## 🔄 Phase 2 — Auth Backend APIs (NEXT)

### User Auth

- [ ] POST /auth/user/register
- [ ] POST /auth/user/login
- [ ] POST /auth/user/logout
- [ ] POST /auth/user/refresh-token
- [ ] GET /auth/user/verify-email
- [ ] POST /auth/user/resend-verification
- [ ] POST /auth/user/forgot-password
- [ ] POST /auth/user/reset-password
- [ ] POST /auth/user/2fa/setup
- [ ] POST /auth/user/2fa/verify
- [ ] POST /auth/user/2fa/disable
- [ ] POST /auth/user/2fa/validate
- [ ] GET /auth/user/me
- [ ] GET /auth/google (OAuth)
- [ ] GET /auth/linkedin (OAuth)

### Organization Auth

- [ ] POST /auth/org/register
- [ ] POST /auth/org/login
- [ ] POST /auth/org/logout
- [ ] POST /auth/org/refresh-token
- [ ] GET /auth/org/verify-email
- [ ] POST /auth/org/forgot-password
- [ ] POST /auth/org/reset-password
- [ ] POST /auth/org/2fa/setup
- [ ] POST /auth/org/2fa/verify
- [ ] POST /auth/org/2fa/validate
- [ ] GET /auth/org/me

### Admin Auth

- [ ] POST /auth/admin/login
- [ ] POST /auth/admin/logout
- [ ] POST /auth/admin/refresh-token
- [ ] GET /auth/admin/me

---

## ⏳ Phase 3 — Core Backend APIs

### User

- [ ] GET/PUT /user/profile
- [ ] POST /user/profile/avatar
- [ ] POST /user/profile/resume

### Jobs

- [ ] POST /org/jobs
- [ ] GET /org/jobs
- [ ] PUT /org/jobs/:id
- [ ] DELETE /org/jobs/:id
- [ ] PATCH /org/jobs/:id/publish
- [ ] GET /jobs (public search)
- [ ] GET /jobs/:slug (public detail)

### Applications

- [ ] POST /applications (with email trigger)
- [ ] GET /applications (user)
- [ ] PATCH /org/jobs/:id/applications/:appId (status change)
- [ ] DELETE /applications/:id (withdraw)

### Subscriptions & Payments

- [ ] GET /subscription/plans
- [ ] POST /subscription/checkout (Stripe session)
- [ ] POST /webhooks/stripe
- [ ] Subscription gating middleware
- [ ] Auto-assign FREE on register

### Incentives

- [ ] Auto-create on HIRED status
- [ ] POST /org/incentives/:id/pay
- [ ] Stripe PaymentIntent for incentives

### Admin

- [ ] All admin CRUD endpoints
- [ ] Platform stats

---

## ⏳ Phase 4 — Frontend

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

### Organization Dashboard

- [ ] Overview / stats
- [ ] Job management (CRUD + rich text editor)
- [ ] Applications pipeline (Kanban/table)
- [ ] Incentives
- [ ] Company profile

### Admin Dashboard

- [ ] Platform stats
- [ ] User management
- [ ] Organization management (approval)
- [ ] Jobs moderation
- [ ] Payments & Subscriptions

---

## ⏳ Phase 5 — Testing & Deployment

- [ ] Unit tests (services)
- [ ] Integration tests (auth flows)
- [ ] E2E tests (Playwright)
- [ ] Docker setup
- [ ] GitHub Actions CI/CD
- [ ] Production deployment
- [ ] Monitoring (Sentry)

---

## 📝 Notes & Decisions Log

| Date    | Decision                      | Reason                                                                 |
| ------- | ----------------------------- | ---------------------------------------------------------------------- |
| Phase 1 | PostgreSQL over MongoDB       | Relational data with complex joins (jobs, applications, subscriptions) |
| Phase 1 | Prisma over TypeORM           | Better type inference, cleaner migrations                              |
| Phase 1 | BullMQ for emails             | Async processing, retries, prevents blocking API responses             |
| Phase 1 | Separate User & Org models    | Different auth flows, fields, and business rules                       |
| Phase 1 | Subscription auto-assign FREE | Seamless UX — users don't have to do anything extra                    |
| Phase 1 | Fixed $50 incentive           | Simple, predictable, easy to implement                                 |
