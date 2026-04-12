# 📡 API Contract — CareerArch

> Base URL: `https://api.CareerArch.com/api/v1`
> Auth: Bearer JWT in `Authorization` header
> All responses follow the format:
>
> ```json
> { "success": true, "message": "...", "data": {...}, "meta": {...} }
> ```

---

## 🔐 AUTH — User

| Method | Endpoint                         | Auth | Description                       |
| ------ | -------------------------------- | ---- | --------------------------------- |
| POST   | `/auth/user/register`            | ❌   | Register new user                 |
| POST   | `/auth/user/login`               | ❌   | Login, get access + refresh token |
| POST   | `/auth/user/logout`              | ✅   | Invalidate refresh token          |
| POST   | `/auth/user/refresh-token`       | ❌   | Get new access token              |
| POST   | `/auth/user/forgot-password`     | ❌   | Send reset email                  |
| POST   | `/auth/user/reset-password`      | ❌   | Reset password with token         |
| POST   | `/auth/user/verify-email`        | ❌   | Verify email with token           |
| POST   | `/auth/user/resend-verification` | ❌   | Resend verification email         |
| POST   | `/auth/user/2fa/setup`           | ✅   | Generate 2FA QR code              |
| POST   | `/auth/user/2fa/verify`          | ✅   | Verify & enable 2FA               |
| POST   | `/auth/user/2fa/disable`         | ✅   | Disable 2FA                       |
| POST   | `/auth/user/2fa/validate`        | ❌   | Validate 2FA OTP on login         |
| GET    | `/auth/user/me`                  | ✅   | Get current user                  |
| GET    | `/auth/google`                   | ❌   | OAuth Google login                |
| GET    | `/auth/linkedin`                 | ❌   | OAuth LinkedIn login              |

---

## 🔐 AUTH — Organization

| Method | Endpoint                    | Auth | Description               |
| ------ | --------------------------- | ---- | ------------------------- |
| POST   | `/auth/org/register`        | ❌   | Register new organization |
| POST   | `/auth/org/login`           | ❌   | Login organization        |
| POST   | `/auth/org/logout`          | ✅   | Invalidate refresh token  |
| POST   | `/auth/org/refresh-token`   | ❌   | Get new access token      |
| POST   | `/auth/org/forgot-password` | ❌   | Send reset email          |
| POST   | `/auth/org/reset-password`  | ❌   | Reset password with token |
| POST   | `/auth/org/verify-email`    | ❌   | Verify email with token   |
| POST   | `/auth/org/2fa/setup`       | ✅   | Generate 2FA QR code      |
| POST   | `/auth/org/2fa/verify`      | ✅   | Enable 2FA                |
| POST   | `/auth/org/2fa/validate`    | ❌   | Validate 2FA OTP on login |
| GET    | `/auth/org/me`              | ✅   | Get current organization  |

---

## 🔐 AUTH — Admin

| Method | Endpoint                    | Auth     | Description          |
| ------ | --------------------------- | -------- | -------------------- |
| POST   | `/auth/admin/login`         | ❌       | Admin login          |
| POST   | `/auth/admin/logout`        | ✅       | Admin logout         |
| POST   | `/auth/admin/refresh-token` | ❌       | Refresh access token |
| GET    | `/auth/admin/me`            | ✅ Admin | Get current admin    |

---

## 👤 USER — Profile

| Method | Endpoint                | Auth    | Description         |
| ------ | ----------------------- | ------- | ------------------- |
| GET    | `/user/profile`         | ✅ User | Get own profile     |
| PUT    | `/user/profile`         | ✅ User | Update profile      |
| POST   | `/user/profile/avatar`  | ✅ User | Upload avatar       |
| POST   | `/user/profile/resume`  | ✅ User | Upload resume (PDF) |
| DELETE | `/user/profile/resume`  | ✅ User | Delete resume       |
| PUT    | `/user/change-password` | ✅ User | Change password     |
| DELETE | `/user/account`         | ✅ User | Deactivate account  |

---

## 💼 JOBS — Public

| Method | Endpoint           | Auth | Description                |
| ------ | ------------------ | ---- | -------------------------- |
| GET    | `/jobs`            | ❌   | Search/list published jobs |
| GET    | `/jobs/:slug`      | ❌   | Get single job detail      |
| GET    | `/jobs/categories` | ❌   | Get all job categories     |
| GET    | `/jobs/featured`   | ❌   | Get featured/promoted jobs |

**Query params for `/jobs`:**

```
?q=developer         # keyword search
&location=NYC
&type=FULL_TIME
&category=Engineering
&experienceLevel=Senior
&salaryMin=50000
&salaryMax=120000
&isRemote=true
&page=1
&limit=20
&sortBy=createdAt   # createdAt | salary | relevance
&sortOrder=desc
```

---

## 💼 JOBS — Organization

| Method | Endpoint                            | Auth   | Description                   |
| ------ | ----------------------------------- | ------ | ----------------------------- |
| POST   | `/org/jobs`                         | ✅ Org | Create job                    |
| GET    | `/org/jobs`                         | ✅ Org | List own jobs                 |
| GET    | `/org/jobs/:id`                     | ✅ Org | Get single job                |
| PUT    | `/org/jobs/:id`                     | ✅ Org | Update job                    |
| DELETE | `/org/jobs/:id`                     | ✅ Org | Delete job                    |
| PATCH  | `/org/jobs/:id/publish`             | ✅ Org | Publish a draft job           |
| PATCH  | `/org/jobs/:id/close`               | ✅ Org | Close job (stop applications) |
| GET    | `/org/jobs/:id/applications`        | ✅ Org | Get all applications for job  |
| PATCH  | `/org/jobs/:id/applications/:appId` | ✅ Org | Update application status     |

---

## 📝 APPLICATIONS — User

| Method | Endpoint            | Auth    | Description            |
| ------ | ------------------- | ------- | ---------------------- |
| POST   | `/applications`     | ✅ User | Apply to a job         |
| GET    | `/applications`     | ✅ User | Get my applications    |
| GET    | `/applications/:id` | ✅ User | Get single application |
| DELETE | `/applications/:id` | ✅ User | Withdraw application   |
| POST   | `/jobs/:id/save`    | ✅ User | Save a job             |
| DELETE | `/jobs/:id/save`    | ✅ User | Unsave a job           |
| GET    | `/user/saved-jobs`  | ✅ User | Get saved jobs         |

**POST `/applications` body:**

```json
{
  "jobId": "uuid",
  "coverLetter": "string (optional)",
  "resumeUrl": "string (optional, overrides profile resume)",
  "answers": { "q1": "answer1" }
}
```

---

## 💳 SUBSCRIPTIONS — User

| Method | Endpoint                   | Auth    | Description                    |
| ------ | -------------------------- | ------- | ------------------------------ |
| GET    | `/subscription/plans`      | ❌      | List all plans                 |
| GET    | `/subscription/my`         | ✅ User | Get my subscription            |
| POST   | `/subscription/checkout`   | ✅ User | Create Stripe checkout session |
| POST   | `/subscription/cancel`     | ✅ User | Cancel subscription            |
| POST   | `/subscription/reactivate` | ✅ User | Reactivate subscription        |
| POST   | `/webhooks/stripe`         | ❌      | Stripe webhook handler         |

---

## 🏢 ORGANIZATION — Dashboard

| Method | Endpoint                  | Auth   | Description                  |
| ------ | ------------------------- | ------ | ---------------------------- |
| GET    | `/org/profile`            | ✅ Org | Get org profile              |
| PUT    | `/org/profile`            | ✅ Org | Update org profile           |
| POST   | `/org/profile/logo`       | ✅ Org | Upload company logo          |
| GET    | `/org/dashboard/stats`    | ✅ Org | Dashboard stats              |
| GET    | `/org/applications`       | ✅ Org | All applications across jobs |
| GET    | `/org/incentives`         | ✅ Org | All pending/paid incentives  |
| POST   | `/org/incentives/:id/pay` | ✅ Org | Pay hiring incentive         |

---

## 🛡️ ADMIN — Dashboard

| Method | Endpoint                           | Auth     | Description             |
| ------ | ---------------------------------- | -------- | ----------------------- |
| GET    | `/admin/dashboard/stats`           | ✅ Admin | Platform overview stats |
| GET    | `/admin/users`                     | ✅ Admin | List all users          |
| GET    | `/admin/users/:id`                 | ✅ Admin | Get user detail         |
| PATCH  | `/admin/users/:id/suspend`         | ✅ Admin | Suspend user            |
| PATCH  | `/admin/users/:id/activate`        | ✅ Admin | Activate user           |
| GET    | `/admin/organizations`             | ✅ Admin | List all organizations  |
| GET    | `/admin/organizations/:id`         | ✅ Admin | Get org detail          |
| PATCH  | `/admin/organizations/:id/approve` | ✅ Admin | Approve organization    |
| PATCH  | `/admin/organizations/:id/suspend` | ✅ Admin | Suspend organization    |
| GET    | `/admin/jobs`                      | ✅ Admin | List all jobs           |
| PATCH  | `/admin/jobs/:id/takedown`         | ✅ Admin | Remove a job            |
| GET    | `/admin/payments`                  | ✅ Admin | All payments            |
| GET    | `/admin/subscriptions`             | ✅ Admin | All subscriptions       |
| GET    | `/admin/incentives`                | ✅ Admin | All incentives          |
| POST   | `/admin/incentives/:id/waive`      | ✅ Admin | Waive an incentive      |

---

## 🔔 NOTIFICATIONS

| Method | Endpoint                  | Auth   | Description          |
| ------ | ------------------------- | ------ | -------------------- |
| GET    | `/notifications`          | ✅ Any | Get my notifications |
| PATCH  | `/notifications/:id/read` | ✅ Any | Mark single read     |
| PATCH  | `/notifications/read-all` | ✅ Any | Mark all as read     |

---

## Standard Response Formats

### Success

```json
{
  "success": true,
  "message": "Job created successfully",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "totalPages": 8
  }
}
```

### Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email address" }]
}
```

### HTTP Status Codes

| Code | Meaning                            |
| ---- | ---------------------------------- |
| 200  | OK                                 |
| 201  | Created                            |
| 204  | No Content (DELETE)                |
| 400  | Bad Request / Validation Error     |
| 401  | Unauthorized (no/invalid token)    |
| 403  | Forbidden (insufficient role/plan) |
| 404  | Not Found                          |
| 409  | Conflict (duplicate)               |
| 422  | Unprocessable Entity               |
| 429  | Too Many Requests                  |
| 500  | Internal Server Error              |
