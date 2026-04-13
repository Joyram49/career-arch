# 🏢 CareerArch — Glassdoor-Clone Job Portal

> A full-stack, production-grade job portal platform with role-based dashboards,
> subscription billing, and automated hiring incentives.

---

## 📌 Project Overview

**CareerArch** is an industry-standard job portal platform inspired by
Glassdoor. It connects talent (job seekers) with organizations (employers)
through a feature-rich, secure, and scalable platform.

### Core Roles

| Role              | Description                                                                          |
| ----------------- | ------------------------------------------------------------------------------------ |
| **Admin**         | Platform super-user — manages users, organizations, subscriptions, disputes, payouts |
| **Organization**  | Posts jobs, reviews applications, manages hiring pipeline, pays incentives           |
| **User (Talent)** | Searches jobs, applies with subscription gating, tracks applications                 |

---

## 🗂️ Project Phases

### Phase 1 — Project Structure & Documentation ✅ _(Current)_

- Project architecture design
- Tech stack finalization
- Package selection
- API contract documentation
- Database schema design
- Folder structure setup

### Phase 2 — Auth Backend APIs _(Next)_

- Sign Up / Sign In
- Access Token + Refresh Token
- Forget Password / Reset Password
- Two-Factor Authentication (2FA)
- Remember Me
- OAuth (Google, LinkedIn)
- Email Verification

### Phase 3 — Core Backend APIs

- Job CRUD (Organization)
- Job Search & Filtering (User)
- Application Flow
- Subscription Plans (Free/Basic/Premium)
- Stripe Payment Integration
- Hiring Incentive System
- Email Notifications

### Phase 4 — Frontend Implementation

- Auth Pages
- User Dashboard
- Organization Dashboard
- Admin Dashboard
- Job Search & Detail Pages
- Application Tracker
- Subscription & Billing Pages

### Phase 5 — Testing, Optimization & Deployment

- Unit & Integration Tests
- Performance Optimization
- CI/CD Pipeline
- Production Deployment

---

## 📁 Repository Structure

```tree
CareerArch/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── config/             # DB, Stripe, Mail, Redis config
│   │   ├── controllers/        # Route handlers
│   │   ├── middlewares/        # Auth, RBAC, rate limiting
│   │   ├── models/             # Mongoose/Sequelize models
│   │   ├── routes/             # API route definitions
│   │   ├── services/           # Business logic layer
│   │   ├── utils/              # Helpers, validators, constants
│   │   ├── jobs/               # Background job workers (BullMQ)
│   │   └── app.js
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
├── frontend/                   # Next.js 14 App Router
│   ├── app/
│   │   ├── (auth)/             # Login, register, reset password
│   │   ├── (public)/           # Landing, job search, job detail
│   │   ├── dashboard/
│   │   │   ├── admin/
│   │   │   ├── organization/
│   │   │   └── user/
│   │   └── api/                # Next.js API routes (BFF)
│   ├── components/
│   ├── hooks/
│   ├── store/                  # Zustand state management
│   ├── lib/
│   └── package.json
│
└── docs/                       # Full documentation
    ├── PROJECT_OVERVIEW.md     # This file
    ├── TECH_STACK.md
    ├── DATABASE_SCHEMA.md
    ├── API_CONTRACT.md
    ├── SUBSCRIPTION_PLAN.md
    ├── PAYMENT_FLOW.md
    └── EMAIL_TEMPLATES.md
```

---

## 🔗 Quick Links

- [Tech Stack](./docs/TECH_STACK.md)
- [Database Schema](./docs/DATABASE_SCHEMA.md)
- [API Contract](./docs/API_CONTRACT.md)
- [Subscription & Payment](./docs/SUBSCRIPTION_PLAN.md)
- [Email Templates](./docs/EMAIL_TEMPLATES.md)
