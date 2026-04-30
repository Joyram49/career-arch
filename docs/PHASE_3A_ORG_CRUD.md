# Phase 3A — Complete Implementation Guide

## Overview of all files created

```
SCHEMA CHANGE:
  prisma/schema.prisma                    ← edit manually (instructions below)

NEW SOURCE FILES:
  src/validations/org.validation.ts       ← new file
  src/services/org.profile.service.ts     ← new file
  src/services/org.billing.service.ts     ← new file
  src/services/admin.org.service.ts       ← new file
  src/controllers/org.profile.controller.ts   ← new file
  src/controllers/org.billing.controller.ts   ← new file
  src/controllers/admin.org.controller.ts     ← new file
  src/middlewares/requireOrgReady.ts      ← new file
  src/routes/org.routes.ts               ← new file
  src/routes/admin.org.routes.ts         ← new file

EDITED FILES:
  src/routes/index.ts                     ← add 2 new route imports
```

---

## Step 1 — Edit prisma/schema.prisma

### 1a. Add OVERDUE to IncentiveStatus enum

Find this block and add `OVERDUE`:

```prisma
enum IncentiveStatus {
  PENDING
  OVERDUE      // ← ADD THIS LINE
  PAID
  WAIVED
  DISPUTED
}
```

### 1b. Add 3 fields to Organization model

Find the Organization model. After `lastLoginAt` and before `createdAt`, add:

```prisma
  // ── Billing ───────────────────────────────────────────────
  stripeDefaultPaymentMethodId String?
  isPaymentMethodOnFile        Boolean   @default(false)
  hasUnpaidIncentives          Boolean   @default(false)
```

---

## Step 2 — Run the migration

```bash
npx prisma migrate dev --name phase3a_org_billing
npm run db:generate
```

---

## Step 3 — Copy new source files

Copy all files from this phase3a/ folder into your src/ directory, maintaining
the same paths:

```bash
# From repo root:
cp phase3a/src/validations/org.validation.ts src/validations/
cp phase3a/src/services/org.profile.service.ts src/services/
cp phase3a/src/services/org.billing.service.ts src/services/
cp phase3a/src/services/admin.org.service.ts src/services/
cp phase3a/src/controllers/org.profile.controller.ts src/controllers/
cp phase3a/src/controllers/org.billing.controller.ts src/controllers/
cp phase3a/src/controllers/admin.org.controller.ts src/controllers/
cp phase3a/src/middlewares/requireOrgReady.ts src/middlewares/
cp phase3a/src/routes/org.routes.ts src/routes/
cp phase3a/src/routes/admin.org.routes.ts src/routes/
```

---

## Step 4 — Update src/routes/index.ts

Add these two imports and registrations (see phase3a/src/routes/index.ts):

```typescript
import adminOrgRoutes from './admin.org.routes';
import orgRoutes from './org.routes';

router.use('/org', orgRoutes);
router.use('/admin', adminOrgRoutes);
```

---

## Step 5 — Verify TypeScript compiles

```bash
npm run typecheck
```

Fix any issues before proceeding.

---

## Step 6 — Manual smoke test (order matters)

### Register + verify an org (already works from Phase 2)

```
POST /api/v1/auth/org/register
POST /api/v1/auth/org/login  (before approval — should work)
```

### Test profile endpoints

```
GET  /api/v1/org/profile           → should return current profile
PUT  /api/v1/org/profile           → update companyName, description, etc.
```

### Admin approves the org

```
POST  /api/v1/auth/admin/login     → get admin token
PATCH /api/v1/admin/organizations/:orgId/approve
```

Check your Stripe dashboard — a Customer should appear.

### Test billing endpoints

```
GET  /api/v1/org/billing           → isPaymentMethodOnFile: false, card: null
POST /api/v1/org/billing/setup-intent  → returns { clientSecret, customerId }
```

(For full card setup, you need a real frontend with Stripe.js. In testing, you
can mock the paymentMethodId as pm_card_visa from Stripe test fixtures.)

```
POST /api/v1/org/billing/payment-method
Body: { "paymentMethodId": "pm_card_visa" }    ← use Stripe test payment method
GET  /api/v1/org/billing           → now shows isPaymentMethodOnFile: true + card details
```

### Test requireOrgReady gate (Phase 3B preview)

Any job posting route will return 403 until both isApproved and
isPaymentMethodOnFile are true.

---

## API Endpoints Added

| Method | Endpoint                                 | Auth           | Description                          |
| ------ | ---------------------------------------- | -------------- | ------------------------------------ |
| GET    | /api/v1/org/profile                      | ORG            | Get org profile                      |
| PUT    | /api/v1/org/profile                      | ORG            | Update org profile                   |
| GET    | /api/v1/org/billing                      | ORG            | Get billing info + card details      |
| POST   | /api/v1/org/billing/setup-intent         | ORG (approved) | Create Stripe SetupIntent            |
| POST   | /api/v1/org/billing/payment-method       | ORG (approved) | Save confirmed payment method        |
| DELETE | /api/v1/org/billing/payment-method       | ORG            | Remove payment method                |
| GET    | /api/v1/admin/organizations              | ADMIN          | List orgs with filters               |
| PATCH  | /api/v1/admin/organizations/:id/approve  | ADMIN          | Approve org + create Stripe Customer |
| PATCH  | /api/v1/admin/organizations/:id/suspend  | ADMIN          | Suspend org                          |
| PATCH  | /api/v1/admin/organizations/:id/activate | ADMIN          | Reactivate org                       |

---

## Frontend Integration Note (for later)

The two-step Stripe card setup flow on the frontend looks like:

```javascript
// Step 1: Get clientSecret from your backend
const { data } = await axios.post('/org/billing/setup-intent');
const { clientSecret } = data.data;

// Step 2: Confirm card with Stripe.js (renders card element)
const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: { card: cardElement },
});

// Step 3: Send the paymentMethodId back to your backend
await axios.post('/org/billing/payment-method', {
  paymentMethodId: setupIntent.payment_method,
});
```

---

## What requireOrgReady does (for Phase 3B)

When you build job posting in Phase 3B, add it like this:

```typescript
// In src/routes/org.jobs.routes.ts
import { requireOrgReady } from '@middlewares/requireOrgReady';

router.post(
  '/jobs',
  authenticate,
  authorize('ORGANIZATION'),
  requireOrgReady, // ← gates: approved + payment method + no unpaid incentives
  asyncHandler(OrgJobController.createJob),
);
```

The middleware handles all three gate conditions with clear, actionable error
messages directing the org to the right endpoint to resolve each issue.
