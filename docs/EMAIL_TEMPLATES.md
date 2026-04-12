# 📧 Email Templates & Notifications — CareerArch

> Email Service: **BREVO** via **Nodemailer**
> All emails use HTML templates stored in `/backend/src/templates/emails/`

---

## Email Events Matrix

| Trigger                     | Recipient    | Template                          |
| --------------------------- | ------------ | --------------------------------- |
| User registers              | User         | `verify-email.html`               |
| User forgot password        | User         | `reset-password.html`             |
| User applies to job         | User         | `application-submitted-user.html` |
| User applies to job         | Organization | `application-submitted-org.html`  |
| Application status changes  | User         | `application-status-update.html`  |
| User subscription activated | User         | `subscription-activated.html`     |
| Subscription renewal        | User         | `subscription-renewed.html`       |
| Subscription cancelled      | User         | `subscription-cancelled.html`     |
| Payment failed              | User         | `payment-failed.html`             |
| Candidate hired             | Organization | `incentive-due.html`              |
| Incentive payment receipt   | Organization | `incentive-paid.html`             |
| Org account approved        | Organization | `org-approved.html`               |
| 2FA setup complete          | User/Org     | `2fa-enabled.html`                |
| New job posted              | Admin        | `new-job-posted.html` (digest)    |

---

## Email Queue (BullMQ)

Emails are processed asynchronously via BullMQ:

```typescript
// jobs/email.queue.ts
import { Queue, Worker } from "bullmq";
import { sendEmail } from "../services/email.service";

export const emailQueue = new Queue("emails", {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});

// Worker processes the queue
new Worker(
  "emails",
  async (job) => {
    const { to, subject, template, variables } = job.data;
    await sendEmail({ to, subject, template, variables });
  },
  { connection: redisClient },
);
```

---

## Application Confirmation Email — User

**Subject:** `✅ Application Submitted — [Job Title] at [Company]`

```
Hi [First Name],

Your application for [Job Title] at [Company Name] has been successfully submitted!

Application Details:
  • Position: [Job Title]
  • Company: [Company Name]
  • Applied On: [Date]
  • Status: Under Review

You can track your application status in your dashboard at any time.

Good luck! 🍀
The CareerArch Team
```

---

## Application Received Email — Organization

**Subject:** `📩 New Application — [Job Title] from [Candidate Name]`

```
Hello [Company Name],

You have received a new application for your posted position.

Applicant Details:
  • Name: [Candidate Name]
  • Position: [Job Title]
  • Applied On: [Date]

View the full application and resume in your Organization Dashboard.

[View Application →]

CareerArch Team
```

---

## Hiring Incentive Due — Organization

**Subject:** `🎉 You Hired [Candidate Name] — $50 Incentive Due`

```
Congratulations!

You successfully hired [Candidate Name] for [Job Title].

As per the CareerArch hiring agreement, a platform incentive of $50.00 USD
is now due within 7 days.

[Pay Incentive Now →]

If you have questions, contact support@CareerArch.com.

CareerArch Team
```

---

## Env Variables for Email

```env
BREVO_SMTP_KEY=BV.xxxxx
BREVO_SMTP_USER=
MAIL_FROM_ADDRESS=noreply@CareerArch.com
MAIL_FROM_NAME=CareerArch
MAIL_BASE_URL=https://CareerArch.com
```
