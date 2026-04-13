# 📧 Email Templates & Notifications — CareerArch

> Email Service: **Brevo** via **Nodemailer SMTP** All emails use HTML templates
> stored in `/src/templates/emails/` SMTP Host: `smtp-relay.brevo.com` | Port:
> `587`

---

## Email Events Matrix

| Trigger                     | Recipient    | Template                          |
| --------------------------- | ------------ | --------------------------------- |
| User registers              | User         | `verify-email.html`               |
| Org registers               | Organization | `verify-email-org.html`           |
| User forgot password        | User         | `reset-password.html`             |
| Password changed            | User/Org     | `password-changed.html`           |
| 2FA enabled                 | User/Org     | `2fa-enabled.html`                |
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

---

## Brevo SMTP Setup

CareerArch uses **Brevo** (formerly Sendinblue) as the email provider via
Nodemailer SMTP relay.

```typescript
// src/config/email.ts
import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // STARTTLS on port 587
  auth: {
    user: env.BREVO_SMTP_USER, // your Brevo account email or SMTP login
    pass: env.BREVO_SMTP_KEY, // Brevo SMTP key (not your account password)
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});
```

### Getting Your Brevo SMTP Credentials

1. Go to [app.brevo.com](https://app.brevo.com)
2. Click your name → **SMTP & API**
3. Go to the **SMTP** tab
4. Copy:
   - **SMTP Login** → `BREVO_SMTP_USER`
   - **SMTP Key** (generate if needed) → `BREVO_SMTP_KEY`

---

## Email Queue (BullMQ)

Emails are processed asynchronously via BullMQ to avoid blocking API responses:

```typescript
// src/jobs/queues/email.queue.ts
import { Queue, Worker } from 'bullmq';
import { sendEmail } from '@services/email.service';

export const emailQueue = new Queue('emails', {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

new Worker(
  'emails',
  async (job) => {
    const { to, subject, template, variables } = job.data;
    await sendEmail({ to, subject, template, variables });
  },
  { connection: redisClient },
);
```

---

## Template System

Templates use `{{VARIABLE}}` placeholders replaced at send time:

```typescript
// src/services/email.service.ts
function loadTemplate(
  templateName: string,
  variables: Record<string, string | number | boolean>,
): string {
  const templatePath = path.join(
    basePath,
    'templates',
    'emails',
    `${templateName}.html`,
  );
  let html = fs.readFileSync(templatePath, 'utf-8');

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, String(value));
  });

  // Global replacements applied to every template
  html = html.replace(/{{APP_NAME}}/g, 'CareerArch');
  html = html.replace(/{{APP_URL}}/g, env.FRONTEND_URL);
  html = html.replace(/{{SUPPORT_EMAIL}}/g, env.MAIL_FROM_ADDRESS);
  html = html.replace(/{{YEAR}}/g, new Date().getFullYear().toString());

  return html;
}
```

### Global Variables (auto-injected into every template)

| Variable            | Value                            |
| ------------------- | -------------------------------- |
| `{{APP_NAME}}`      | CareerArch                       |
| `{{APP_URL}}`       | From `FRONTEND_URL` env var      |
| `{{SUPPORT_EMAIL}}` | From `MAIL_FROM_ADDRESS` env var |
| `{{YEAR}}`          | Current year                     |

---

## Implemented Email Senders

```typescript
// All available in src/services/email.service.ts

sendVerificationEmail(email, firstName, verifyUrl);
sendOrgVerificationEmail(email, companyName, verifyUrl);
sendPasswordResetEmail(email, firstName, resetUrl);
sendPasswordChangedEmail(email, firstName);
sendTwoFaEnabledEmail(email, firstName);
sendApplicationConfirmationUser(
  email,
  firstName,
  jobTitle,
  companyName,
  dashboardUrl,
);
sendApplicationReceivedOrg(
  email,
  companyName,
  candidateName,
  jobTitle,
  applicationUrl,
);
```

---

## Email Content Reference

### Verification Email — User

**Subject:** `✅ Verify your CareerArch email address` **Template:**
`verify-email.html` **Variables:** `FIRST_NAME`, `VERIFY_URL` **Expiry:** 24
hours

### Verification Email — Organization

**Subject:** `✅ Verify your CareerArch organization email` **Template:**
`verify-email-org.html` **Variables:** `COMPANY_NAME`, `VERIFY_URL` **Expiry:**
24 hours

### Password Reset

**Subject:** `🔑 Reset your CareerArch password` **Template:**
`reset-password.html` **Variables:** `FIRST_NAME`, `RESET_URL` **Expiry:** 1
hour

### Password Changed Confirmation

**Subject:** `🔒 Your CareerArch password was changed` **Template:**
`password-changed.html` **Variables:** `FIRST_NAME`

### 2FA Enabled

**Subject:** `🛡️ Two-factor authentication enabled` **Template:**
`2fa-enabled.html` **Variables:** `FIRST_NAME`

### Application Confirmation — User

**Subject:** `✅ Application Submitted — [Job Title] at [Company]` **Template:**
`application-submitted-user.html` **Variables:** `FIRST_NAME`, `JOB_TITLE`,
`COMPANY_NAME`, `APPLIED_DATE`, `DASHBOARD_URL`

### Application Received — Organization

**Subject:** `📩 New Application — [Job Title] from [Candidate Name]`
**Template:** `application-submitted-org.html` **Variables:** `COMPANY_NAME`,
`CANDIDATE_NAME`, `JOB_TITLE`, `APPLIED_DATE`, `APPLICATION_URL`

### Hiring Incentive Due — Organization

**Subject:** `🎉 You Hired [Candidate Name] — $50 Incentive Due` **Template:**
`incentive-due.html` _(to be created in Phase 3)_ **Variables:** `COMPANY_NAME`,
`CANDIDATE_NAME`, `JOB_TITLE`, `AMOUNT`, `DUE_DATE`, `PAY_URL`

---

## Env Variables for Email

```env
# Brevo SMTP credentials
BREVO_SMTP_KEY=your-brevo-smtp-key
BREVO_SMTP_USER=your-brevo-smtp-login

# Sender identity
MAIL_FROM_ADDRESS=noreply@careerarch.com
MAIL_FROM_NAME=CareerArch
```

---

## Brevo Free Tier Limits

| Limit              | Value                    |
| ------------------ | ------------------------ |
| Emails/day         | 300                      |
| Emails/month       | 9,000                    |
| SMTP relay         | ✅ Included              |
| Email logs         | ✅ 30 days               |
| Transactional only | ✅ Nodemailer compatible |

> For production with higher volume, upgrade to Brevo Starter plan.
