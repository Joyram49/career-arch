# 💳 Subscription Plans & Payment Flow — CareerArch

---

## Subscription Plans

| Feature                    | Free    | Basic ($9.99/mo) | Premium ($24.99/mo) |
| -------------------------- | ------- | ---------------- | ------------------- |
| Apply to Free jobs         | ✅      | ✅               | ✅                  |
| Apply to Basic jobs        | ❌      | ✅               | ✅                  |
| Apply to Premium jobs      | ❌      | ❌               | ✅                  |
| Saved job slots            | 5       | 25               | Unlimited           |
| Resume visibility to orgs  | Limited | Standard         | Featured            |
| Application analytics      | ❌      | Basic            | Advanced            |
| Profile badge              | Free    | Basic            | Premium ✨          |
| Priority in search results | ❌      | ❌               | ✅                  |
| AI resume tips             | ❌      | ❌               | ✅                  |
| Monthly applications       | 10      | 50               | Unlimited           |

---

## Auto-Assign Free Plan on Registration

When a user registers successfully, a background job automatically creates a
`Subscription` record:

```typescript
// services/subscription.service.ts
export async function assignFreeSubscription(userId: string) {
  await prisma.subscription.create({
    data: {
      userId,
      plan: 'FREE',
      status: 'ACTIVE',
    },
  });
}
```

This is called inside the user registration controller after email verification.

---

## Stripe Product & Price IDs

```text
STRIPE_BASIC_PRICE_ID=price_xxxxxxxx      # $9.99/month recurring
STRIPE_PREMIUM_PRICE_ID=price_yyyyyyyy    # $24.99/month recurring
STRIPE_INCENTIVE_AMOUNT=5000              # $50.00 in cents (fixed per hire)
```

---

## Subscription Upgrade Flow

```flowchart
User clicks "Upgrade to Basic"
        │
        ▼
POST /subscription/checkout
{
  "plan": "BASIC"  // or "PREMIUM"
}
        │
        ▼
Backend creates Stripe Checkout Session
(mode: "subscription", priceId from plan)
        │
        ▼
Return { checkoutUrl }
        │
        ▼
Frontend redirects to Stripe-hosted page
        │
        ▼
User enters card → Stripe processes
        │
        ▼
Stripe fires webhook → POST /webhooks/stripe
Event: "checkout.session.completed"
        │
        ▼
Backend updates Subscription record
(plan, stripeSubscriptionId, period dates)
        │
        ▼
Send "Subscription Activated" email
```

---

## Stripe Webhook Events to Handle

| Event                           | Action                                  |
| ------------------------------- | --------------------------------------- |
| `checkout.session.completed`    | Activate subscription                   |
| `invoice.payment_succeeded`     | Renew subscription period               |
| `invoice.payment_failed`        | Mark subscription PAST_DUE, notify user |
| `customer.subscription.deleted` | Mark subscription CANCELLED             |
| `customer.subscription.updated` | Sync plan changes                       |
| `payment_intent.succeeded`      | Mark incentive as PAID                  |
| `payment_intent.payment_failed` | Notify org, flag incentive              |

---

## Hiring Incentive Flow

When an organization marks an application as **HIRED**:

```flowchart
Org updates application status → HIRED
        │
        ▼
Backend auto-creates HiringIncentive record
{
  orgId, jobId, applicationId,
  amount: 50.00,
  status: PENDING,
  dueAt: now + 7 days
}
        │
        ▼
Notification sent to Organization
"You hired [Candidate Name]. Pay $50 incentive within 7 days."
        │
        ▼
Org goes to Incentives dashboard
        │
        ▼
Clicks "Pay Incentive"
POST /org/incentives/:id/pay
        │
        ▼
Backend creates Stripe PaymentIntent
(one-time, $50, from org's saved payment method)
        │
        ▼
Stripe processes payment
        │
        ▼
Webhook: payment_intent.succeeded
        │
        ▼
Update HiringIncentive status → PAID
Create Payment record
Notify Admin
```

---

## Subscription Gating on Application

```typescript
// middlewares/subscription-guard.ts

export async function checkApplicationEligibility(userId: string, job: Job) {
  const subscription = await getActiveSubscription(userId);
  const planHierarchy = { FREE: 0, BASIC: 1, PREMIUM: 2 };

  if (planHierarchy[subscription.plan] < planHierarchy[job.requiredPlan]) {
    throw new ForbiddenError(
      `This job requires a ${job.requiredPlan} subscription. Upgrade to apply.`,
    );
  }
}
```

---

## Stripe Env Variables Required

```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_BASIC_PRICE_ID=price_xxx
STRIPE_PREMIUM_PRICE_ID=price_xxx
STRIPE_INCENTIVE_AMOUNT=5000
STRIPE_CURRENCY=usd
```
