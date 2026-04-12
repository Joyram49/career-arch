# 🗄️ Database Schema — CareerArch

> Database: **PostgreSQL 16** | ORM: **Prisma**

---

## Entity Relationship Overview

```
User ──────────────── Subscription
 │                         │
 ├── Application ──── Job ─┤── Organization
 │                         │
 └── Profile          OrgProfile
                           │
                    HiringIncentive
                           │
                      StripePayment
```

---

## Prisma Schema (`schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

enum Role {
  ADMIN
  ORGANIZATION
  USER
}

enum SubscriptionPlan {
  FREE
  BASIC
  PREMIUM
}

enum SubscriptionStatus {
  ACTIVE
  INACTIVE
  CANCELLED
  PAST_DUE
}

enum JobStatus {
  DRAFT
  PUBLISHED
  CLOSED
  ARCHIVED
}

enum JobType {
  FULL_TIME
  PART_TIME
  CONTRACT
  INTERNSHIP
  FREELANCE
  REMOTE
}

enum ApplicationStatus {
  PENDING
  UNDER_REVIEW
  SHORTLISTED
  INTERVIEW_SCHEDULED
  OFFERED
  HIRED
  REJECTED
  WITHDRAWN
}

enum IncentiveStatus {
  PENDING
  PAID
  WAIVED
  DISPUTED
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

// ─────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────

model User {
  id                    String    @id @default(uuid())
  email                 String    @unique
  password              String
  role                  Role      @default(USER)
  isEmailVerified       Boolean   @default(false)
  emailVerifyToken      String?
  emailVerifyExpiry     DateTime?
  twoFactorEnabled      Boolean   @default(false)
  twoFactorSecret       String?
  rememberMeToken       String?
  rememberMeExpiry      DateTime?
  passwordResetToken    String?
  passwordResetExpiry   DateTime?
  refreshToken          String?
  lastLoginAt           DateTime?
  isActive              Boolean   @default(true)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  profile               UserProfile?
  applications          Application[]
  subscription          Subscription?
  refreshTokens         RefreshToken[]

  @@map("users")
}

// ─────────────────────────────────────────────
// USER PROFILE
// ─────────────────────────────────────────────

model UserProfile {
  id              String   @id @default(uuid())
  userId          String   @unique
  firstName       String
  lastName        String
  phone           String?
  avatarUrl       String?
  resumeUrl       String?
  headline        String?
  summary         String?
  location        String?
  linkedinUrl     String?
  githubUrl       String?
  portfolioUrl    String?
  skills          String[]
  experienceYears Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_profiles")
}

// ─────────────────────────────────────────────
// ORGANIZATION
// ─────────────────────────────────────────────

model Organization {
  id              String    @id @default(uuid())
  email           String    @unique
  password        String
  role            Role      @default(ORGANIZATION)
  isEmailVerified Boolean   @default(false)
  emailVerifyToken      String?
  emailVerifyExpiry     DateTime?
  twoFactorEnabled      Boolean   @default(false)
  twoFactorSecret       String?
  refreshToken          String?
  passwordResetToken    String?
  passwordResetExpiry   DateTime?
  isActive        Boolean   @default(true)
  isApproved      Boolean   @default(false)  // Admin approves orgs
  stripeCustomerId String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  profile         OrgProfile?
  jobs            Job[]
  incentives      HiringIncentive[]
  payments        Payment[]
  refreshTokens   RefreshToken[]

  @@map("organizations")
}

// ─────────────────────────────────────────────
// ORGANIZATION PROFILE
// ─────────────────────────────────────────────

model OrgProfile {
  id              String   @id @default(uuid())
  orgId           String   @unique
  companyName     String
  logoUrl         String?
  website         String?
  industry        String?
  companySize     String?  // "1-10", "11-50", "51-200", etc.
  foundedYear     Int?
  description     String?
  location        String?
  country         String?
  linkedinUrl     String?
  twitterUrl      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization    Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("org_profiles")
}

// ─────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────

model Admin {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(ADMIN)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("admins")
}

// ─────────────────────────────────────────────
// REFRESH TOKENS
// ─────────────────────────────────────────────

model RefreshToken {
  id             String    @id @default(uuid())
  token          String    @unique
  userId         String?
  orgId          String?
  isRevoked      Boolean   @default(false)
  expiresAt      DateTime
  createdAt      DateTime  @default(now())

  user           User?         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization? @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

// ─────────────────────────────────────────────
// SUBSCRIPTION
// ─────────────────────────────────────────────

model Subscription {
  id                  String             @id @default(uuid())
  userId              String             @unique
  plan                SubscriptionPlan   @default(FREE)
  status              SubscriptionStatus @default(ACTIVE)
  stripeSubscriptionId String?
  stripeCustomerId    String?
  currentPeriodStart  DateTime?
  currentPeriodEnd    DateTime?
  cancelAtPeriodEnd   Boolean            @default(false)
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  user                User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}

// ─────────────────────────────────────────────
// JOB
// ─────────────────────────────────────────────

model Job {
  id                String      @id @default(uuid())
  orgId             String
  title             String
  slug              String      @unique
  description       String      // Rich text (TipTap HTML)
  requirements      String?
  responsibilities  String?
  jobType           JobType
  status            JobStatus   @default(DRAFT)
  location          String?
  isRemote          Boolean     @default(false)
  salaryMin         Float?
  salaryMax         Float?
  salaryCurrency    String      @default("USD")
  experienceLevel   String?     // "Entry", "Mid", "Senior", "Lead"
  skills            String[]
  category          String?
  deadline          DateTime?
  vacancies         Int         @default(1)
  views             Int         @default(0)
  requiredPlan      SubscriptionPlan @default(FREE)  // Min plan to apply
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  publishedAt       DateTime?

  organization      Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  applications      Application[]
  savedBy           SavedJob[]
  incentives        HiringIncentive[]

  @@map("jobs")
}

// ─────────────────────────────────────────────
// APPLICATION
// ─────────────────────────────────────────────

model Application {
  id              String            @id @default(uuid())
  jobId           String
  userId          String
  status          ApplicationStatus @default(PENDING)
  coverLetter     String?
  resumeUrl       String?           // Can override profile resume
  answers         Json?             // Screening question answers
  notes           String?           // Internal org notes
  appliedAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  emailSentToUser   Boolean         @default(false)
  emailSentToOrg    Boolean         @default(false)

  job             Job               @relation(fields: [jobId], references: [id], onDelete: Cascade)
  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  incentive       HiringIncentive?

  @@unique([jobId, userId])  // One application per job per user
  @@map("applications")
}

// ─────────────────────────────────────────────
// SAVED JOBS
// ─────────────────────────────────────────────

model SavedJob {
  id        String   @id @default(uuid())
  userId    String
  jobId     String
  savedAt   DateTime @default(now())

  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@unique([userId, jobId])
  @@map("saved_jobs")
}

// ─────────────────────────────────────────────
// HIRING INCENTIVE
// ─────────────────────────────────────────────

model HiringIncentive {
  id              String          @id @default(uuid())
  orgId           String
  jobId           String
  applicationId   String          @unique
  amount          Float           // Fixed incentive amount (e.g., $50)
  currency        String          @default("USD")
  status          IncentiveStatus @default(PENDING)
  stripePaymentIntentId String?
  paidAt          DateTime?
  dueAt           DateTime?       // Deadline to pay
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  organization    Organization    @relation(fields: [orgId], references: [id])
  job             Job             @relation(fields: [jobId], references: [id])
  application     Application     @relation(fields: [applicationId], references: [id])

  @@map("hiring_incentives")
}

// ─────────────────────────────────────────────
// PAYMENT
// ─────────────────────────────────────────────

model Payment {
  id                    String        @id @default(uuid())
  orgId                 String?
  userId                String?
  type                  String        // "subscription" | "incentive"
  amount                Float
  currency              String        @default("USD")
  status                PaymentStatus @default(PENDING)
  stripePaymentIntentId String?
  stripeInvoiceId       String?
  metadata              Json?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  organization          Organization? @relation(fields: [orgId], references: [id])

  @@map("payments")
}

// ─────────────────────────────────────────────
// NOTIFICATION
// ─────────────────────────────────────────────

model Notification {
  id          String   @id @default(uuid())
  recipientId String
  recipientRole Role
  title       String
  message     String
  isRead      Boolean  @default(false)
  link        String?
  createdAt   DateTime @default(now())

  @@map("notifications")
}
```

---

## Key Design Decisions

1. **Separate User & Organization models** — Different auth flows, profile fields, and permissions
2. **Unique application constraint** — `[jobId, userId]` prevents duplicate applications
3. **RequiredPlan on Job** — Orgs can mark certain jobs as requiring Basic/Premium subscription
4. **HiringIncentive auto-created** — Triggered when application status changes to `HIRED`
5. **RefreshToken table** — Stored in DB for revocation; also cached in Redis
6. **Soft delete** — Use `isActive: false` instead of hard deletes for audit trail
