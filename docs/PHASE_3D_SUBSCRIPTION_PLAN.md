# 💳 Phase 3c — Subscription Plan System Design (v2)

# CareerArch | FINAL PLAN — Ready for Implementation

> Status: **APPROVED FOR IMPLEMENTATION** Scope: Admin CRUD plans (synced to
> Stripe) · User purchase/upgrade/cancel · Feature gating Stack: Express 5 ·
> Prisma 7 · Stripe SDK (full custom code) · BullMQ · Zod 4

---

## 1. Open Questions — Resolved

| #   | Question                      | Decision                                                                      |
| --- | ----------------------------- | ----------------------------------------------------------------------------- |
| 1   | Proration on downgrade        | **Wait until next billing period** (simpler, fewer refund edge cases)         |
| 2   | Free trial                    | **No free trial** (keeps billing simple, avoids abuse)                        |
| 3   | Annual billing                | **Defer to Phase 5** — monthly only for now                                   |
| 4   | Webhook failure handling      | **Rely on Stripe's 3-day retry** + log to Sentry. BullMQ retry not needed     |
| 5   | savedJobCount denormalization | **Yes** — denormalized counter + monthly reconciliation cron                  |
| 6   | Stripe portal                 | **Not used** — all billing UI built custom inside our admin + user dashboards |

---

## 2. Plan Definitions

| Feature                          | Free          | Basic ($9.99/mo) | Premium ($24.99/mo) |
| -------------------------------- | ------------- | ---------------- | ------------------- |
| **Job browsing**                 | First 20 only | All jobs         | All jobs            |
| **Job applications / month**     | 5             | 30               | Unlimited           |
| **Saved jobs (at a time)**       | 5             | 50               | Unlimited           |
| **View org/company profiles**    | ❌            | ✅               | ✅                  |
| **Resume visibility to orgs**    | Hidden name   | Standard         | Featured / Top      |
| **Profile badge**                | —             | Basic 🔵         | Premium ⭐          |
| **Priority in org search**       | ❌            | ❌               | ✅                  |
| **Application status tracking**  | Basic         | Detailed         | Detailed + timeline |
| **AI resume tips**               | ❌            | ❌               | ✅                  |
| **Early job alerts (email)**     | ❌            | ✅               | ✅                  |
| **Download application history** | ❌            | ✅               | ✅                  |
| **Resume versions**              | 1             | 3                | Unlimited           |
| **Skill endorsements visible**   | ❌            | ✅               | ✅                  |
| **Cancel anytime**               | N/A           | ✅               | ✅                  |

---

## 3. Architecture Overview

```
Admin Dashboard
      │
      ▼
Admin creates / updates / deletes a plan
      │
      ├──► Upserts Stripe Product + Price (via Stripe SDK)
      │     └── Stores stripeProductId + stripePriceId in PlanCatalogue DB
      │
      └──► Updates PlanCatalogue row (features, price, display info)

User Dashboard
      │
      ▼
User clicks "Upgrade to Basic"
      │
      ├──► POST /subscription/checkout
      │     └── Our code calls stripe.checkout.sessions.create(...)
      │         └── Returns { checkoutUrl } → frontend redirects
      │
      ▼
Stripe fires webhook → POST /webhooks/stripe
      └──► Our webhook handler updates Subscription row in DB
```

**Key principle:** We write every Stripe API call ourselves. No Stripe-hosted
portal. The only Stripe-hosted page used is the Checkout page (payment form) —
everything else (plan display, invoice history, cancel button) is our own UI
backed by our own API.

---

## 4. Database Changes

### 4a. New `PlanCatalogue` model

Admin-managed plan catalogue. Synced to Stripe on every create/update.

```prisma
model PlanCatalogue {
  id                String           @id @default(uuid())
  key               SubscriptionPlan @unique        // FREE | BASIC | PREMIUM
  displayName       String                          // "Free", "Basic", "Premium"
  description       String?
  monthlyPriceCents Int              @default(0)    // 0 = free, 999 = $9.99, 2499 = $24.99
  stripeProductId   String?                         // Stripe Product ID (prod_xxx)
  stripePriceId     String?                         // Stripe Price ID (price_xxx) — active
  isActive          Boolean          @default(true)
  sortOrder         Int              @default(0)    // controls display order
  features          Json                            // see §4b
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  @@map("plan_catalogue")
}
```

### 4b. `features` JSON shape

```json
{
  "jobBrowseLimit": 20, // -1 = unlimited
  "applyMonthlyLimit": 5, // -1 = unlimited
  "saveJobsLimit": 5, // -1 = unlimited
  "canViewOrgProfile": false,
  "resumeVersions": 1, // -1 = unlimited
  "canDownloadHistory": false,
  "earlyJobAlerts": false,
  "prioritySearch": false,
  "aiResumeTips": false,
  "badge": null // null | "basic" | "premium"
}
```

### 4c. `Subscription` model — two new columns

```prisma
// Add to existing Subscription model:
applyCountThisMonth  Int      @default(0)
applyCountResetAt    DateTime @default(now())
savedJobCount        Int      @default(0)   // denormalized, bumped on save/unsave
```

---

## 5. Stripe Sync Strategy (Admin-driven)

### When admin CREATES a plan (Basic or Premium):

```
1. stripe.products.create({ name, description })
   → Save stripeProductId

2. stripe.prices.create({
     product: stripeProductId,
     currency: "usd",
     unit_amount: monthlyPriceCents,
     recurring: { interval: "month" }
   })
   → Save stripePriceId

3. Insert PlanCatalogue row with both IDs
```

### When admin UPDATES a plan's price:

```
Stripe does NOT allow editing a Price's amount after creation.
Strategy:
1. stripe.prices.create(...)      ← new Price with new amount
2. stripe.prices.update(oldPriceId, { active: false })   ← archive old
3. Update PlanCatalogue.stripePriceId = newPriceId

Existing subscribers keep their old price until next renewal
(Stripe handles this automatically via subscription item).
```

### When admin UPDATES display info only (name, description, features):

```
1. stripe.products.update(stripeProductId, { name, description })
2. Update PlanCatalogue row (no new Price needed)
```

### When admin DELETES / DEACTIVATES a plan:

```
Hard delete is NOT allowed if any active subscriber exists.
Strategy:
1. Check: SELECT COUNT(*) FROM subscriptions WHERE plan = key AND status = ACTIVE
2. If count > 0 → 409 "Cannot delete plan with active subscribers"
3. Else:
   stripe.products.update(stripeProductId, { active: false })
   stripe.prices.update(stripePriceId, { active: false })
   PlanCatalogue.isActive = false  (soft delete — keep row for history)
```

> **FREE plan is immutable** — admin cannot create, delete, or change its price.
> Admin can only update FREE plan's features JSON and display copy.

---

## 6. API Endpoints

### 6a. Admin — Plan Catalogue

| Method | Endpoint                  | Auth     | Description                              |
| ------ | ------------------------- | -------- | ---------------------------------------- |
| GET    | `/admin/plans`            | ✅ ADMIN | List all plans (active + inactive)       |
| GET    | `/admin/plans/:id`        | ✅ ADMIN | Get single plan with Stripe sync status  |
| POST   | `/admin/plans`            | ✅ ADMIN | Create Basic or Premium plan on Stripe   |
| PUT    | `/admin/plans/:id`        | ✅ ADMIN | Update plan (price → new Stripe Price)   |
| DELETE | `/admin/plans/:id`        | ✅ ADMIN | Soft-delete (guards against active subs) |
| PATCH  | `/admin/plans/:id/toggle` | ✅ ADMIN | Toggle isActive without Stripe change    |

### 6b. Admin — Subscription Management

| Method | Endpoint                          | Auth     | Description                         |
| ------ | --------------------------------- | -------- | ----------------------------------- |
| GET    | `/admin/subscriptions`            | ✅ ADMIN | List all subscriptions (paginated)  |
| GET    | `/admin/subscriptions/stats`      | ✅ ADMIN | MRR, counts per plan, churn rate    |
| GET    | `/admin/subscriptions/:id`        | ✅ ADMIN | Single subscription detail          |
| POST   | `/admin/subscriptions/:id/cancel` | ✅ ADMIN | Force cancel user subscription      |
| POST   | `/admin/subscriptions/:id/refund` | ✅ ADMIN | Issue Stripe refund on last invoice |

### 6c. Public — Plan Discovery

| Method | Endpoint              | Auth | Description                        |
| ------ | --------------------- | ---- | ---------------------------------- |
| GET    | `/subscription/plans` | ❌   | List active plans for pricing page |

### 6d. User — Subscription Management

| Method | Endpoint                   | Auth    | Description                        |
| ------ | -------------------------- | ------- | ---------------------------------- |
| GET    | `/subscription/my`         | ✅ USER | Current subscription + usage stats |
| POST   | `/subscription/checkout`   | ✅ USER | Create Stripe Checkout session     |
| POST   | `/subscription/cancel`     | ✅ USER | Cancel at period end               |
| POST   | `/subscription/reactivate` | ✅ USER | Undo cancel before period ends     |
| GET    | `/subscription/invoices`   | ✅ USER | List invoices from Stripe API      |

### 6e. Stripe Webhooks

| Method | Endpoint           | Auth | Description            |
| ------ | ------------------ | ---- | ---------------------- |
| POST   | `/webhooks/stripe` | ❌   | Stripe webhook handler |

---

## 7. Subscription Flows (Full Detail)

### 7a. User Upgrade Flow

```
POST /subscription/checkout  { plan: "BASIC" }
        │
        ▼
Guard: user.subscription.plan !== "BASIC" (can't buy current plan)
        │
        ▼
Load PlanCatalogue where key = "BASIC"
Verify isActive = true, stripePriceId exists
        │
        ▼
If user has no stripeCustomerId on Subscription:
  stripe.customers.create({ email, name, metadata: { userId } })
  → save to Subscription.stripeCustomerId
        │
        ▼
If user already has stripeSubscriptionId (already on a paid plan):
  → UPGRADE PATH (see §7c below)
        │
        ▼
stripe.checkout.sessions.create({
  mode: "subscription",
  customer: stripeCustomerId,
  line_items: [{ price: stripePriceId, quantity: 1 }],
  success_url: `${FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url:  `${FRONTEND_URL}/subscription/cancel`,
  metadata: { userId, targetPlan: "BASIC" },
  subscription_data: { metadata: { userId } }
})
        │
        ▼
Return { checkoutUrl }
Frontend redirects to Stripe Checkout page
```

### 7b. Webhook: `checkout.session.completed`

```
Webhook arrives (verified with stripe.webhooks.constructEvent)
        │
        ▼
Extract: userId from session.metadata
Extract: stripeSubscriptionId from session.subscription
Extract: targetPlan from session.metadata
        │
        ▼
Retrieve full subscription from Stripe:
stripe.subscriptions.retrieve(stripeSubscriptionId)
        │
        ▼
Update our DB Subscription:
  plan = targetPlan
  status = ACTIVE
  stripeSubscriptionId
  stripeCustomerId
  currentPeriodStart = Unix timestamp → DateTime
  currentPeriodEnd   = Unix timestamp → DateTime
  cancelAtPeriodEnd  = false
        │
        ▼
Send "Subscription Activated" email
```

### 7c. Upgrade / Downgrade (already on paid plan)

```
User on BASIC wants PREMIUM (or vice versa)
POST /subscription/checkout { plan: "PREMIUM" }
        │
        ▼
User already has stripeSubscriptionId → use update flow, not checkout
        │
        ▼
Retrieve subscription from Stripe to get current item ID:
stripe.subscriptions.retrieve(stripeSubscriptionId)
  → items.data[0].id  = subscriptionItemId
        │
        ▼
stripe.subscriptions.update(stripeSubscriptionId, {
  items: [{ id: subscriptionItemId, price: newStripePriceId }],
  proration_behavior: "none",   // change takes effect next billing period
})
        │
        ▼
Update our DB Subscription:
  plan = PREMIUM  (optimistically — Stripe confirms via webhook)
        │
        ▼
Webhook: customer.subscription.updated → sync period dates
        │
        ▼
Return { success: true, message: "Plan updated. Changes apply next billing period." }
```

### 7d. Cancel Flow

```
POST /subscription/cancel
        │
        ▼
Guard: subscription.plan !== FREE
Guard: subscription.cancelAtPeriodEnd !== true (already cancelling)
        │
        ▼
stripe.subscriptions.update(stripeSubscriptionId, {
  cancel_at_period_end: true
})
        │
        ▼
Update DB: cancelAtPeriodEnd = true
        │
        ▼
Send "Cancellation Scheduled" email
  (access continues until currentPeriodEnd)
Return { message: "Cancelled. Access continues until {currentPeriodEnd}." }

─────────────────────────────────────────────
Later, when period ends:
Stripe fires: customer.subscription.deleted
        │
        ▼
Webhook handler:
  plan = FREE
  status = ACTIVE
  stripeSubscriptionId = null
  cancelAtPeriodEnd = false
  currentPeriodStart = null
  currentPeriodEnd = null
        │
        ▼
Send "Downgraded to Free" email
```

### 7e. Reactivate Flow

```
POST /subscription/reactivate
        │
        ▼
Guard: cancelAtPeriodEnd = true (nothing to reactivate otherwise)
        │
        ▼
stripe.subscriptions.update(stripeSubscriptionId, {
  cancel_at_period_end: false
})
        │
        ▼
Update DB: cancelAtPeriodEnd = false
Return { message: "Reactivated. Your plan will continue as normal." }
```

### 7f. Webhook: `invoice.payment_failed`

```
stripe fires: invoice.payment_failed
        │
        ▼
Find subscription by stripeCustomerId
Update: status = PAST_DUE
        │
        ▼
Send "Payment Failed" email with link to update card
  (card update page = our custom page that calls stripe.paymentMethods API)
```

### 7g. Webhook: `invoice.payment_succeeded`

```
stripe fires: invoice.payment_succeeded
        │
        ▼
Find subscription by stripeCustomerId
Update:
  status = ACTIVE
  currentPeriodStart / currentPeriodEnd (from invoice)
  applyCountThisMonth = 0   ← reset on renewal
  applyCountResetAt = now()
```

### 7h. Admin Force Cancel

```
POST /admin/subscriptions/:id/cancel
        │
        ▼
stripe.subscriptions.cancel(stripeSubscriptionId)
  (immediate cancel, no period-end grace)
        │
        ▼
Update DB:
  plan = FREE, status = ACTIVE
  stripeSubscriptionId = null
  cancelAtPeriodEnd = false
        │
        ▼
Send "Account Downgraded by Admin" email
```

---

## 8. Feature Gating Middlewares

### 8a. `checkSaveJobLimit` → `src/middlewares/checkSaveJobLimit.ts`

Applied on: `POST /jobs/:id/save`

```
Load subscription where userId = req.user.sub
Load PlanCatalogue where key = subscription.plan → features.saveJobsLimit
        │
        ▼
saveJobsLimit === -1 → next()
        │
        ▼
subscription.savedJobCount >= saveJobsLimit
  → 403 { message: "Save limit reached (5/5). Upgrade to Basic.", upgradeUrl: "/subscription/plans" }
        │
        ▼
next()
// Increment savedJobCount happens inside the save service (not middleware)
```

### 8b. `checkApplyLimit` → `src/middlewares/checkApplyLimit.ts`

Applied on: `POST /applications`

```
Load subscription where userId = req.user.sub
        │
        ▼
If applyCountResetAt < startOfMonth(today):
  Reset: applyCountThisMonth = 0, applyCountResetAt = now()
        │
        ▼
Load PlanCatalogue → features.applyMonthlyLimit
        │
        ▼
applyMonthlyLimit === -1 → next()
        │
        ▼
subscription.applyCountThisMonth >= applyMonthlyLimit
  → 403 { message: "Monthly limit reached (5/5). Resets on the 1st.", upgradeUrl: "..." }
        │
        ▼
next()
// Increment applyCountThisMonth happens inside application service
```

### 8c. `checkOrgProfileAccess` → `src/middlewares/checkOrgProfileAccess.ts`

Applied on: `GET /org/profile/:id` (public org profile route)

```
If !req.user → 401
        │
        ▼
Load PlanCatalogue → features.canViewOrgProfile
        │
        ▼
false → 403 { message: "Upgrade to Basic to view company profiles." }
        │
        ▼
next()
```

### 8d. Job Browse Limit (service-level, not middleware)

Applied inside `job.service.ts → searchJobs()`:

```typescript
if (subscription.plan === 'FREE') {
  // Force first 20 results regardless of pagination params
  queryOptions.take = Math.min(take, planFeatures.jobBrowseLimit); // 20
  queryOptions.skip = 0;
  meta.isLimited = true;
}
```

Response `meta` includes:

```json
{ "isLimited": true, "limitMessage": "Upgrade to see all jobs" }
```

---

## 9. BullMQ Monthly Reset Cron

```
// src/jobs/queues/subscription-reset.queue.ts
// Runs: 00:00 on the 1st of every month

Cron: "0 0 1 * *"
Worker task:
  prisma.subscription.updateMany({
    where: {
      plan: { not: "FREE" },
      applyCountResetAt: { lt: startOfMonth(new Date()) }
    },
    data: {
      applyCountThisMonth: 0,
      applyCountResetAt: startOfMonth(new Date())
    }
  })
  logger.info(`Reset apply counters for N subscriptions`)
```

---

## 10. Seed Data (updated)

Three rows seeded in `PlanCatalogue` on first deploy. `stripeProductId` and
`stripePriceId` for BASIC and PREMIUM are populated by the admin
creating/updating those plans from the dashboard. FREE plan has no Stripe IDs
(it is free, no Stripe object needed).

```typescript
// FREE — immutable, no Stripe IDs
{ key: 'FREE', displayName: 'Free', monthlyPriceCents: 0, sortOrder: 0,
  features: { jobBrowseLimit: 20, applyMonthlyLimit: 5, saveJobsLimit: 5,
              canViewOrgProfile: false, resumeVersions: 1, canDownloadHistory: false,
              earlyJobAlerts: false, prioritySearch: false, aiResumeTips: false, badge: null } }

// BASIC — admin fills in Stripe IDs via dashboard
{ key: 'BASIC', displayName: 'Basic', monthlyPriceCents: 999, sortOrder: 1,
  features: { jobBrowseLimit: -1, applyMonthlyLimit: 30, saveJobsLimit: 50,
              canViewOrgProfile: true, resumeVersions: 3, canDownloadHistory: true,
              earlyJobAlerts: true, prioritySearch: false, aiResumeTips: false, badge: 'basic' } }

// PREMIUM — admin fills in Stripe IDs via dashboard
{ key: 'PREMIUM', displayName: 'Premium', monthlyPriceCents: 2499, sortOrder: 2,
  features: { jobBrowseLimit: -1, applyMonthlyLimit: -1, saveJobsLimit: -1,
              canViewOrgProfile: true, resumeVersions: -1, canDownloadHistory: true,
              earlyJobAlerts: true, prioritySearch: true, aiResumeTips: true, badge: 'premium' } }
```

---

## 11. Env Variables

```env
# Stripe (existing)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# No STRIPE_BASIC_PRICE_ID / STRIPE_PREMIUM_PRICE_ID in .env anymore
# These are stored in DB (PlanCatalogue) and managed by admin via dashboard
# They are created programmatically when admin sets up plans
```

> **Breaking change from v1:** `STRIPE_BASIC_PRICE_ID` and
> `STRIPE_PREMIUM_PRICE_ID` are removed from `.env`. The admin dashboard is the
> single source of truth for Stripe IDs.

---

## 12. Response Shapes

### `GET /subscription/my`

```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "uuid",
      "plan": "BASIC",
      "status": "ACTIVE",
      "cancelAtPeriodEnd": false,
      "currentPeriodStart": "2026-04-01T00:00:00Z",
      "currentPeriodEnd": "2026-05-01T00:00:00Z",
      "usage": {
        "applyCountThisMonth": 12,
        "applyMonthlyLimit": 30,
        "savedJobCount": 14,
        "saveJobsLimit": 50
      }
    },
    "planDetails": {
      "key": "BASIC",
      "displayName": "Basic",
      "monthlyPriceCents": 999,
      "features": { "...": "..." }
    }
  }
}
```

### `POST /subscription/checkout` → `200 OK`

```json
{
  "success": true,
  "data": { "checkoutUrl": "https://checkout.stripe.com/..." }
}
```

### `POST /admin/plans` (admin creates Basic/Premium)

Request:

```json
{
  "key": "BASIC",
  "displayName": "Basic",
  "description": "For active job seekers",
  "monthlyPriceCents": 999,
  "features": { "...": "..." }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "uuid",
      "key": "BASIC",
      "stripeProductId": "prod_xxx",
      "stripePriceId": "price_xxx",
      "...": "..."
    }
  }
}
```

### Feature Gating Error (all gating endpoints)

```json
{
  "success": false,
  "message": "You've reached your monthly application limit (5/5). Upgrade to Basic for 30 applications/month.",
  "upgradeUrl": "/subscription/plans"
}
```

---

## 13. Webhook Security

All Stripe webhooks verified using:

```typescript
stripe.webhooks.constructEvent(
  req.body, // raw Buffer — must NOT parse JSON before this
  req.headers['stripe-signature'],
  env.STRIPE_WEBHOOK_SECRET,
);
```

The `/webhooks/stripe` route must use
`express.raw({ type: 'application/json' })` **before** the global
`express.json()` middleware. This requires a dedicated raw body parser mounted
only on that route.

---

## 14. Files to Create / Modify

### New files

```
src/
├── controllers/
│   ├── subscription.controller.ts
│   └── admin.plan.controller.ts
├── services/
│   ├── subscription.service.ts
│   └── admin.plan.service.ts          ← Stripe sync logic lives here
├── middlewares/
│   ├── checkSaveJobLimit.ts
│   ├── checkApplyLimit.ts
│   └── checkOrgProfileAccess.ts
├── routes/
│   ├── subscription.routes.ts
│   ├── admin.plan.routes.ts
│   └── webhook.routes.ts
├── validations/
│   └── subscription.validation.ts
└── jobs/
    └── queues/
        └── subscription-reset.queue.ts

src/templates/emails/
    ├── subscription-activated.html
    ├── subscription-cancelled.html
    ├── subscription-downgraded.html
    └── payment-failed.html
```

### Modified files

```
prisma/schema.prisma           — add PlanCatalogue + 3 cols on Subscription
prisma/seed.ts                 — seed 3 PlanCatalogue rows
src/routes/index.ts            — mount new routes
src/config/env.ts              — remove STRIPE_BASIC/PREMIUM_PRICE_ID
docs/.env.example              — reflect removed env vars
src/services/email.service.ts  — add 4 new email sender functions
```

---

## 15. Implementation Order

1. **Prisma schema** — add `PlanCatalogue` model + 3 new cols on `Subscription`
   → migrate → seed
2. **`admin.plan.service.ts`** — Stripe Product + Price create/update/archive +
   DB sync
3. **`admin.plan.controller.ts` + `admin.plan.routes.ts`** — CRUD endpoints
4. **`subscription.service.ts`** — checkout, cancel, reactivate, invoices,
   my-subscription
5. **`subscription.controller.ts` + `subscription.routes.ts`**
6. **`webhook.routes.ts`** — raw body parser + all Stripe event handlers
7. **Feature gating middlewares** — checkSaveJobLimit, checkApplyLimit,
   checkOrgProfileAccess
8. **Job browse limit** — patch into job.service.ts searchJobs()
9. **BullMQ cron** — subscription-reset.queue.ts
10. **Email templates** (4 new HTML files) + wire into email.service.ts
11. **Integration tests** — subscription flows + gating
