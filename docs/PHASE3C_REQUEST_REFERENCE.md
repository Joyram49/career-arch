# 📬 Phase 3c — API Request Body Reference

# CareerArch | Subscription Plan System

# Base URL: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)

> All protected routes require: `Authorization: Bearer <accessToken>`
>
> Admin routes require an ADMIN token. User subscription routes require a USER
> token.

---

## ─────────────────────────────────────────────

## ADMIN — PLAN CATALOGUE

## ─────────────────────────────────────────────

---

### 1. GET /admin/plans

**List all plans (including inactive)** No request body.

**Headers:**

```
Authorization: Bearer <adminToken>
```

**Expected response:**

```json
{
  "success": true,
  "message": "Plans retrieved",
  "data": {
    "plans": [
      {
        "id": "uuid",
        "key": "FREE",
        "displayName": "Free",
        "monthlyPriceCents": 0,
        "stripeProductId": null,
        "stripePriceId": null,
        "isActive": true,
        "sortOrder": 0,
        "features": { "...": "..." }
      }
    ]
  }
}
```

---

### 2. GET /admin/plans/:id

**Get a single plan by ID** No request body.

**Headers:**

```
Authorization: Bearer <adminToken>
```

**URL param:**

```
/admin/plans/3f7a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c
```

---

### 3. POST /admin/plans

**Create BASIC plan — syncs Product + Price to Stripe**

> ⚠️ Only `BASIC` or `PREMIUM` are valid keys. `FREE` is system-managed. Run
> this once after first deploy to connect BASIC to Stripe.

**Headers:**

```
Authorization: Bearer <adminToken>
Content-Type: application/json
```

**Request body:**

```json
{
  "key": "BASIC",
  "displayName": "Basic",
  "description": "For active job seekers who want more reach and visibility.",
  "monthlyPriceCents": 999,
  "features": {
    "jobBrowseLimit": -1,
    "applyMonthlyLimit": 30,
    "saveJobsLimit": 50,
    "canViewOrgProfile": true,
    "resumeVersions": 3,
    "canDownloadHistory": true,
    "earlyJobAlerts": true,
    "prioritySearch": false,
    "aiResumeTips": false,
    "badge": "basic"
  }
}
```

---

### 4. POST /admin/plans (PREMIUM)

**Create PREMIUM plan — syncs Product + Price to Stripe**

**Headers:**

```
Authorization: Bearer <adminToken>
Content-Type: application/json
```

**Request body:**

```json
{
  "key": "PREMIUM",
  "displayName": "Premium",
  "description": "Unlimited access, AI-powered tools, and top placement in search results.",
  "monthlyPriceCents": 2499,
  "features": {
    "jobBrowseLimit": -1,
    "applyMonthlyLimit": -1,
    "saveJobsLimit": -1,
    "canViewOrgProfile": true,
    "resumeVersions": -1,
    "canDownloadHistory": true,
    "earlyJobAlerts": true,
    "prioritySearch": true,
    "aiResumeTips": true,
    "badge": "premium"
  }
}
```

> **Feature field legend:**
>
> - `jobBrowseLimit` — Max jobs shown in search. `-1` = unlimited. `20` = first
>   20 only.
> - `applyMonthlyLimit` — Max applications per calendar month. `-1` = unlimited.
> - `saveJobsLimit` — Max saved jobs at one time. `-1` = unlimited.
> - `canViewOrgProfile` — Can the user open full company profile pages.
> - `resumeVersions` — How many resume files the user can upload. `-1` =
>   unlimited.
> - `canDownloadHistory` — Can the user export their application history as CSV.
> - `earlyJobAlerts` — Does the user receive email alerts for new matching jobs.
> - `prioritySearch` — Does the user's profile appear higher in org talent
>   searches.
> - `aiResumeTips` — Does the user get AI-generated resume improvement
>   suggestions.
> - `badge` — Profile badge shown publicly. `null` | `"basic"` | `"premium"`.

---

### 5. PUT /admin/plans/:id

**Update plan — display info only (no price change)**

**Headers:**

```
Authorization: Bearer <adminToken>
Content-Type: application/json
```

**URL param:**

```
/admin/plans/3f7a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c
```

**Request body:**

```json
{
  "displayName": "Basic Plus",
  "description": "Updated description for the Basic plan."
}
```

---

### 6. PUT /admin/plans/:id (price change)

**Update plan — price change (archives old Stripe Price, creates new one)**

> ⚠️ Existing subscribers keep their current price until next renewal.

**Headers:**

```
Authorization: Bearer <adminToken>
Content-Type: application/json
```

**Request body:**

```json
{
  "monthlyPriceCents": 1199
}
```

---

### 7. PUT /admin/plans/:id (feature update)

**Update plan — modify feature flags only**

**Headers:**

```
Authorization: Bearer <adminToken>
Content-Type: application/json
```

**Request body:**

```json
{
  "features": {
    "applyMonthlyLimit": 40,
    "saveJobsLimit": 75,
    "earlyJobAlerts": true
  }
}
```

> Only the fields you include are merged — omitted fields keep their existing
> values.

---

### 8. PATCH /admin/plans/:id/toggle

**Toggle plan active / inactive** No request body.

**Headers:**

```
Authorization: Bearer <adminToken>
```

**URL param:**

```
/admin/plans/3f7a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c
```

**Expected response:**

```json
{
  "success": true,
  "message": "Plan deactivated",
  "data": { "plan": { "isActive": false, "...": "..." } }
}
```

---

### 9. DELETE /admin/plans/:id

**Soft-delete a plan** No request body.

> ⚠️ Fails with `409` if any active subscribers exist on this plan. Archives the
> Stripe Product and Price.

**Headers:**

```
Authorization: Bearer <adminToken>
```

**URL param:**

```
/admin/plans/3f7a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c
```

**Expected response:** `204 No Content`

---

## ─────────────────────────────────────────────

## ADMIN — SUBSCRIPTION MANAGEMENT

## ─────────────────────────────────────────────

---

### 10. GET /admin/subscriptions

**List all subscriptions — paginated + filterable** No request body.

**Headers:**

```
Authorization: Bearer <adminToken>
```

**Query params (all optional):**

```
GET /admin/subscriptions?page=1&limit=20&plan=BASIC&status=ACTIVE
GET /admin/subscriptions?plan=PREMIUM&status=PAST_DUE
GET /admin/subscriptions?status=CANCELLED&page=2&limit=10
```

**Valid `plan` values:** `FREE` | `BASIC` | `PREMIUM` **Valid `status` values:**
`ACTIVE` | `INACTIVE` | `CANCELLED` | `PAST_DUE`

---

### 11. GET /admin/subscriptions/stats

**Platform subscription stats — MRR, counts per plan, past due** No request
body.

**Headers:**

```
Authorization: Bearer <adminToken>
```

**Expected response:**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalActive": 1523,
      "byPlan": {
        "FREE": 1200,
        "BASIC": 280,
        "PREMIUM": 43
      },
      "mrrCents": 387570,
      "pastDue": 7,
      "cancellingAtPeriodEnd": 14
    }
  }
}
```

> `mrrCents` = `(BASIC count × 999) + (PREMIUM count × 2499)`

---

### 12. GET /admin/subscriptions/:id

**Get a single subscription detail** No request body.

**Headers:**

```
Authorization: Bearer <adminToken>
```

**URL param:**

```
/admin/subscriptions/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

---

### 13. POST /admin/subscriptions/:id/cancel

**Force-cancel a user subscription (immediate, no period-end grace)** No request
body.

> Immediately cancels on Stripe and downgrades user to FREE.

**Headers:**

```
Authorization: Bearer <adminToken>
```

**URL param:**

```
/admin/subscriptions/a1b2c3d4-e5f6-7890-abcd-ef1234567890/cancel
```

**Expected response:**

```json
{
  "success": true,
  "message": "Subscription cancelled and user downgraded to FREE",
  "data": null
}
```

---

### 14. POST /admin/subscriptions/:id/refund

**Refund last paid invoice for a subscription**

**Headers:**

```
Authorization: Bearer <adminToken>
Content-Type: application/json
```

**URL param:**

```
/admin/subscriptions/a1b2c3d4-e5f6-7890-abcd-ef1234567890/refund
```

**Request body:**

```json
{
  "reason": "requested_by_customer"
}
```

> **Valid `reason` values:**
>
> - `"requested_by_customer"` — user asked for a refund
> - `"duplicate"` — user was charged more than once
> - `"fraudulent"` — charge was unauthorized
>
> `reason` is optional — omit entirely if no specific reason.

**Request body (no reason):**

```json
{}
```

**Expected response:**

```json
{
  "success": true,
  "message": "Refund issued successfully",
  "data": { "refundId": "re_3PxyzABC123" }
}
```

---

## ─────────────────────────────────────────────

## PUBLIC — PLAN DISCOVERY

## ─────────────────────────────────────────────

---

### 15. GET /subscription/plans

**List active plans — public, no auth required** No request body. No headers
required.

```
GET /subscription/plans
```

**Expected response:**

```json
{
  "success": true,
  "message": "Plans retrieved",
  "data": {
    "plans": [
      {
        "key": "FREE",
        "displayName": "Free",
        "description": "Get started with the basics. No credit card required.",
        "monthlyPriceCents": 0,
        "features": {
          "jobBrowseLimit": 20,
          "applyMonthlyLimit": 5,
          "saveJobsLimit": 5,
          "canViewOrgProfile": false,
          "resumeVersions": 1,
          "canDownloadHistory": false,
          "earlyJobAlerts": false,
          "prioritySearch": false,
          "aiResumeTips": false,
          "badge": null
        },
        "sortOrder": 0
      },
      {
        "key": "BASIC",
        "displayName": "Basic",
        "description": "For active job seekers who want more reach and visibility.",
        "monthlyPriceCents": 999,
        "features": {
          "jobBrowseLimit": -1,
          "applyMonthlyLimit": 30,
          "saveJobsLimit": 50,
          "canViewOrgProfile": true,
          "resumeVersions": 3,
          "canDownloadHistory": true,
          "earlyJobAlerts": true,
          "prioritySearch": false,
          "aiResumeTips": false,
          "badge": "basic"
        },
        "sortOrder": 1
      },
      {
        "key": "PREMIUM",
        "displayName": "Premium",
        "description": "Unlimited access, AI-powered tools, and top placement in search results.",
        "monthlyPriceCents": 2499,
        "features": {
          "jobBrowseLimit": -1,
          "applyMonthlyLimit": -1,
          "saveJobsLimit": -1,
          "canViewOrgProfile": true,
          "resumeVersions": -1,
          "canDownloadHistory": true,
          "earlyJobAlerts": true,
          "prioritySearch": true,
          "aiResumeTips": true,
          "badge": "premium"
        },
        "sortOrder": 2
      }
    ]
  }
}
```

---

## ─────────────────────────────────────────────

## USER — SUBSCRIPTION MANAGEMENT

## ─────────────────────────────────────────────

---

### 16. GET /subscription/my

**Get current user subscription + usage stats** No request body.

**Headers:**

```
Authorization: Bearer <userToken>
```

**Expected response (FREE user):**

```json
{
  "success": true,
  "message": "Subscription retrieved",
  "data": {
    "subscription": {
      "id": "uuid",
      "plan": "FREE",
      "status": "ACTIVE",
      "cancelAtPeriodEnd": false,
      "currentPeriodStart": null,
      "currentPeriodEnd": null,
      "usage": {
        "applyCountThisMonth": 2,
        "applyMonthlyLimit": 5,
        "savedJobCount": 1,
        "saveJobsLimit": 5
      },
      "planDetails": {
        "key": "FREE",
        "displayName": "Free",
        "monthlyPriceCents": 0,
        "features": {
          "jobBrowseLimit": 20,
          "applyMonthlyLimit": 5,
          "saveJobsLimit": 5,
          "canViewOrgProfile": false,
          "resumeVersions": 1,
          "canDownloadHistory": false,
          "earlyJobAlerts": false,
          "prioritySearch": false,
          "aiResumeTips": false,
          "badge": null
        }
      }
    }
  }
}
```

**Expected response (BASIC user, cancelling):**

```json
{
  "success": true,
  "message": "Subscription retrieved",
  "data": {
    "subscription": {
      "id": "uuid",
      "plan": "BASIC",
      "status": "ACTIVE",
      "cancelAtPeriodEnd": true,
      "currentPeriodStart": "2026-04-01T00:00:00.000Z",
      "currentPeriodEnd": "2026-05-01T00:00:00.000Z",
      "usage": {
        "applyCountThisMonth": 12,
        "applyMonthlyLimit": 30,
        "savedJobCount": 8,
        "saveJobsLimit": 50
      },
      "planDetails": {
        "key": "BASIC",
        "displayName": "Basic",
        "monthlyPriceCents": 999,
        "features": { "...": "..." }
      }
    }
  }
}
```

---

### 17. POST /subscription/checkout

**Create Stripe Checkout session (new subscription)**

> Redirects user to Stripe's hosted payment page. After payment, Stripe fires
> `checkout.session.completed` webhook.

**Headers:**

```
Authorization: Bearer <userToken>
Content-Type: application/json
```

**Request body — upgrade to BASIC:**

```json
{
  "plan": "BASIC"
}
```

**Request body — upgrade to PREMIUM:**

```json
{
  "plan": "PREMIUM"
}
```

> `plan` must be `"BASIC"` or `"PREMIUM"`. Sending `"FREE"` returns `400`.

**Expected response:**

```json
{
  "success": true,
  "message": "Checkout session created",
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_a1B2c3D4e5F6..."
  }
}
```

> Frontend should immediately redirect to `checkoutUrl`.

---

### 18. POST /subscription/cancel

**Cancel subscription at end of current billing period** No request body.

> User keeps access until `currentPeriodEnd`. Then downgrades to FREE.

**Headers:**

```
Authorization: Bearer <userToken>
```

**Expected response:**

```json
{
  "success": true,
  "message": "Subscription cancelled. Access continues until May 1, 2026.",
  "data": {
    "currentPeriodEnd": "2026-05-01T00:00:00.000Z"
  }
}
```

**Error — already on FREE:**

```json
{
  "success": false,
  "message": "You are on the Free plan — nothing to cancel"
}
```

**Error — already cancelling:**

```json
{
  "success": false,
  "message": "Your subscription is already scheduled for cancellation"
}
```

---

### 19. POST /subscription/reactivate

**Undo a pending cancellation before the period ends** No request body.

**Headers:**

```
Authorization: Bearer <userToken>
```

**Expected response:**

```json
{
  "success": true,
  "message": "Subscription reactivated. Your plan will continue as normal.",
  "data": null
}
```

**Error — nothing to reactivate:**

```json
{
  "success": false,
  "message": "Your subscription is not scheduled for cancellation"
}
```

---

### 20. GET /subscription/invoices

**List past paid invoices from Stripe** No request body.

**Headers:**

```
Authorization: Bearer <userToken>
```

**Expected response:**

```json
{
  "success": true,
  "message": "Invoices retrieved",
  "data": {
    "invoices": [
      {
        "id": "in_3PxyzABC123",
        "amountPaid": 999,
        "currency": "usd",
        "status": "paid",
        "periodStart": "2026-04-01T00:00:00.000Z",
        "periodEnd": "2026-05-01T00:00:00.000Z",
        "invoicePdf": "https://pay.stripe.com/invoice/acct_xxx/invst_xxx/pdf",
        "hostedInvoiceUrl": "https://invoice.stripe.com/i/acct_xxx/invst_xxx",
        "createdAt": "2026-04-01T00:00:00.000Z"
      },
      {
        "id": "in_3PabcDEF456",
        "amountPaid": 999,
        "currency": "usd",
        "status": "paid",
        "periodStart": "2026-03-01T00:00:00.000Z",
        "periodEnd": "2026-04-01T00:00:00.000Z",
        "invoicePdf": "https://pay.stripe.com/invoice/acct_xxx/invst_yyy/pdf",
        "hostedInvoiceUrl": "https://invoice.stripe.com/i/acct_xxx/invst_yyy",
        "createdAt": "2026-03-01T00:00:00.000Z"
      }
    ]
  }
}
```

> Returns `[]` for FREE users (no Stripe customer ID yet).

---

## ─────────────────────────────────────────────

## STRIPE WEBHOOK (Stripe → our server)

## ─────────────────────────────────────────────

---

### 21. POST /webhooks/stripe

**Stripe sends this — you never call it manually**

> The webhook route uses `express.raw()` — do NOT send JSON from Postman. For
> local testing use the Stripe CLI:
>
> ```bash
> stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe
> stripe trigger checkout.session.completed
> stripe trigger invoice.payment_failed
> stripe trigger customer.subscription.deleted
> ```

**Headers (set by Stripe, not you):**

```
stripe-signature: t=1234567890,v1=abc123...
Content-Type: application/json
```

**Events handled:**

| Event                           | What we do                                                            |
| ------------------------------- | --------------------------------------------------------------------- |
| `checkout.session.completed`    | Activate subscription, set plan + period dates, send activation email |
| `invoice.payment_succeeded`     | Renew period dates, reset monthly apply counter, mark ACTIVE          |
| `invoice.payment_failed`        | Mark `PAST_DUE`, send payment failed email                            |
| `customer.subscription.deleted` | Downgrade to FREE, clear Stripe IDs, send downgrade email             |
| `customer.subscription.updated` | Sync period dates + `cancelAtPeriodEnd` flag                          |

---

## ─────────────────────────────────────────────

## FEATURE GATING — ERROR RESPONSES

## ─────────────────────────────────────────────

These are returned automatically by middleware — no request body needed.

### Apply limit reached (FREE user hits 5/5)

Triggered on: `POST /applications`

```json
{
  "success": false,
  "message": "You've reached your monthly application limit (5/5). Resets on May 1. Upgrade your plan for more applications.",
  "errors": [
    { "field": "applications", "message": "Monthly apply limit reached" }
  ]
}
```

### Save job limit reached (FREE user hits 5/5)

Triggered on: `POST /jobs/:id/save`

```json
{
  "success": false,
  "message": "You've reached your saved jobs limit (5/5). Upgrade your plan to save more jobs.",
  "errors": [{ "field": "savedJobs", "message": "Save limit reached" }]
}
```

### Org profile access blocked (FREE user)

Triggered on: `GET /org/profile/:id`

```json
{
  "success": false,
  "message": "Upgrade to Basic or Premium to view full company profiles.",
  "errors": [{ "field": "orgProfile", "message": "Plan upgrade required" }]
}
```

### Job browse limited (FREE user — first 20 only)

Triggered on: `GET /jobs` — not an error, just a limited response:

```json
{
  "success": true,
  "message": "Jobs retrieved",
  "data": { "jobs": ["...20 items max..."] },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 20,
    "totalPages": 1,
    "isLimited": true,
    "limitMessage": "Upgrade to see all jobs"
  }
}
```

---

## ─────────────────────────────────────────────

## QUICK SETUP ORDER (first deploy)

## ─────────────────────────────────────────────

```
1. npm run db:migrate:prod
2. npm run db:seed              ← seeds FREE/BASIC/PREMIUM plan rows + demo accounts

3. Login as admin:
   POST /auth/admin/login
   { "email": "admin@careerarch.com", "password": "Admin@123456" }
   → copy accessToken

4. Create BASIC plan on Stripe:
   POST /admin/plans
   → use request body from #3 above

5. Create PREMIUM plan on Stripe:
   POST /admin/plans
   → use request body from #4 above

6. Start stripe webhook listener (dev):
   stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe
```
