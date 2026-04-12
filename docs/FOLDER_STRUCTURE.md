# 📁 Backend Folder Structure — CareerArch

```
backend/
├── src/
│   ├── app.ts                          # Express app setup
│   ├── server.ts                       # HTTP server entry point
│   │
│   ├── config/
│   │   ├── database.ts                 # Prisma client instance
│   │   ├── redis.ts                    # ioredis client
│   │   ├── stripe.ts                   # Stripe SDK init
│   │   ├── email.ts                    # Nodemailer/SendGrid setup
│   │   ├── s3.ts                       # AWS S3 client
│   │   ├── env.ts                      # Validated env (envalid)
│   │   └── logger.ts                   # Winston logger
│   │
│   ├── routes/
│   │   ├── index.ts                    # Main router
│   │   ├── auth.user.routes.ts
│   │   ├── auth.org.routes.ts
│   │   ├── auth.admin.routes.ts
│   │   ├── user.routes.ts
│   │   ├── org.routes.ts
│   │   ├── job.routes.ts               # Public job routes
│   │   ├── application.routes.ts
│   │   ├── subscription.routes.ts
│   │   ├── admin.routes.ts
│   │   ├── notification.routes.ts
│   │   └── webhook.routes.ts
│   │
│   ├── controllers/
│   │   ├── auth/
│   │   │   ├── user.auth.controller.ts
│   │   │   ├── org.auth.controller.ts
│   │   │   └── admin.auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── org.controller.ts
│   │   ├── job.controller.ts
│   │   ├── application.controller.ts
│   │   ├── subscription.controller.ts
│   │   ├── admin.controller.ts
│   │   ├── notification.controller.ts
│   │   └── webhook.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts             # Token generation, verification
│   │   ├── user.service.ts
│   │   ├── org.service.ts
│   │   ├── job.service.ts
│   │   ├── application.service.ts
│   │   ├── subscription.service.ts
│   │   ├── payment.service.ts          # Stripe logic
│   │   ├── incentive.service.ts
│   │   ├── email.service.ts            # Email send functions
│   │   ├── upload.service.ts           # S3 / Cloudinary
│   │   ├── notification.service.ts
│   │   └── admin.service.ts
│   │
│   ├── middlewares/
│   │   ├── authenticate.ts             # JWT verify
│   │   ├── authorize.ts                # RBAC
│   │   ├── subscriptionGuard.ts        # Plan gating
│   │   ├── rateLimiter.ts              # express-rate-limit
│   │   ├── validate.ts                 # Zod validation
│   │   ├── upload.ts                   # Multer config
│   │   ├── errorHandler.ts             # Global error handler
│   │   └── notFound.ts                 # 404 handler
│   │
│   ├── models/                         # Prisma-generated types re-exports
│   │   └── index.ts
│   │
│   ├── validations/
│   │   ├── auth.validation.ts
│   │   ├── user.validation.ts
│   │   ├── org.validation.ts
│   │   ├── job.validation.ts
│   │   └── application.validation.ts
│   │
│   ├── utils/
│   │   ├── asyncHandler.ts             # Wrap async controllers
│   │   ├── apiResponse.ts              # Standardize API responses
│   │   ├── apiError.ts                 # Custom error classes
│   │   ├── token.ts                    # JWT helpers
│   │   ├── crypto.ts                   # Hash, random token helpers
│   │   ├── pagination.ts               # Cursor/offset pagination
│   │   ├── slug.ts                     # Job slug generator
│   │   └── constants.ts               # App-wide constants
│   │
│   ├── jobs/                           # BullMQ workers
│   │   ├── queues/
│   │   │   ├── email.queue.ts
│   │   │   └── notification.queue.ts
│   │   └── workers/
│   │       ├── email.worker.ts
│   │       └── notification.worker.ts
│   │
│   └── templates/
│       └── emails/
│           ├── verify-email.html
│           ├── reset-password.html
│           ├── application-submitted-user.html
│           ├── application-submitted-org.html
│           ├── application-status-update.html
│           ├── subscription-activated.html
│           ├── incentive-due.html
│           └── org-approved.html
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── tests/
│   ├── unit/
│   │   ├── auth.service.test.ts
│   │   ├── job.service.test.ts
│   │   └── subscription.service.test.ts
│   └── integration/
│       ├── auth.test.ts
│       ├── job.test.ts
│       └── application.test.ts
│
├── .env
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
├── jest.config.ts
├── nodemon.json
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## Frontend Folder Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── verify-email/page.tsx
│   │   └── 2fa/page.tsx
│   │
│   ├── (public)/
│   │   ├── page.tsx                    # Landing page
│   │   ├── jobs/
│   │   │   ├── page.tsx                # Job search/listing
│   │   │   └── [slug]/page.tsx         # Job detail
│   │   ├── companies/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── pricing/page.tsx
│   │
│   ├── dashboard/
│   │   ├── user/
│   │   │   ├── page.tsx                # Overview
│   │   │   ├── applications/page.tsx
│   │   │   ├── saved-jobs/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── subscription/page.tsx
│   │   │
│   │   ├── organization/
│   │   │   ├── page.tsx                # Overview
│   │   │   ├── jobs/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── applications/page.tsx
│   │   │   ├── incentives/page.tsx
│   │   │   └── profile/page.tsx
│   │   │
│   │   └── admin/
│   │       ├── page.tsx                # Overview
│   │       ├── users/page.tsx
│   │       ├── organizations/page.tsx
│   │       ├── jobs/page.tsx
│   │       ├── payments/page.tsx
│   │       └── subscriptions/page.tsx
│   │
│   ├── api/                            # Next.js route handlers (BFF)
│   │   └── auth/[...nextauth]/route.ts
│   │
│   ├── layout.tsx
│   ├── providers.tsx
│   └── globals.css
│
├── components/
│   ├── ui/                             # shadcn/ui base
│   ├── auth/
│   ├── jobs/
│   ├── dashboard/
│   ├── shared/
│   └── forms/
│
├── hooks/
│   ├── useAuth.ts
│   ├── useJobs.ts
│   ├── useApplications.ts
│   └── useSubscription.ts
│
├── store/
│   ├── auth.store.ts
│   └── ui.store.ts
│
├── lib/
│   ├── api.ts                          # Axios instance
│   ├── auth.ts                         # NextAuth config
│   └── utils.ts
│
├── types/
│   └── index.ts
│
├── .env.local
├── .env.local.example
├── tailwind.config.ts
├── next.config.ts
└── package.json
```
