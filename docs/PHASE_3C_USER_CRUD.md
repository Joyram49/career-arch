# 📘 Phase 3c — User Profile APIs & Admin User Management

> **Status:** Complete  
> **Base URL:** `https://api.careerarch.com/api/v1`  
> **Depends on:** Phase 2 Auth (all three roles)  
> **Stack:** Express 5 · TypeScript · Prisma 7 · Zod 4 · AWS S3 · bcryptjs ·
> Redis

---

## Table of Contents

1. [Files Delivered](#1-files-delivered)
2. [User Profile APIs](#2-user-profile-apis)
   - [GET /user/profile](#get-userprofile)
   - [PUT /user/profile](#put-userprofile)
   - [POST /user/profile/avatar](#post-userprofileavatar)
   - [POST /user/profile/resume](#post-userprofileresume)
   - [DELETE /user/profile/resume](#delete-userprofileresume)
   - [PUT /user/change-password](#put-userchange-password)
   - [DELETE /user/account](#delete-useraccount)
3. [Admin User Management APIs](#3-admin-user-management-apis)
   - [GET /admin/users](#get-adminusers)
   - [GET /admin/users/:id](#get-adminusersid)
   - [PATCH /admin/users/:id/suspend](#patch-adminuserssuspend)
   - [PATCH /admin/users/:id/activate](#patch-adminusersactivate)
4. [Validation Reference](#4-validation-reference)
5. [S3 File Storage](#5-s3-file-storage)
6. [Security & Session Handling](#6-security--session-handling)
7. [Error Reference](#7-error-reference)
8. [Route Mounting](#8-route-mounting)

---

## 1. Files Delivered

| File                       | Location           | Purpose                                                         |
| -------------------------- | ------------------ | --------------------------------------------------------------- |
| `user.validation.ts`       | `src/validations/` | All Zod schemas for user profile + admin user endpoints         |
| `user.service.ts`          | `src/services/`    | Profile CRUD, avatar/resume upload, password change, deactivate |
| `admin.user.service.ts`    | `src/services/`    | Admin list, detail, suspend, activate                           |
| `upload.service.ts`        | `src/services/`    | AWS S3 upload and delete helpers                                |
| `upload.ts`                | `src/middlewares/` | Multer config (memoryStorage → S3, avatar + resume)             |
| `user.controller.ts`       | `src/controllers/` | User profile HTTP handlers                                      |
| `admin.user.controller.ts` | `src/controllers/` | Admin user management HTTP handlers                             |
| `user.routes.ts`           | `src/routes/`      | User profile route definitions                                  |
| `admin.routes.ts`          | `src/routes/`      | Admin route definitions (expandable for Phase 3d+)              |
| `index.ts`                 | `src/routes/`      | **Updated** — mounts `/user` and `/admin` routers               |

**No new npm packages required.** All dependencies (`@aws-sdk/client-s3`,
`multer`, `bcryptjs`, `ioredis`) were already in `package.json`.

---

## 2. User Profile APIs

All endpoints in this section require:

- A valid access token (JWT) in the `Authorization: Bearer <token>` header
  **or** the `access_token` HttpOnly cookie
- Role: `USER`

---

### GET /user/profile

Returns the authenticated user's full profile including subscription details.

**Auth:** `Bearer <accessToken>` | Cookie  
**Role:** `USER`

**Response `200`:**

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "jane@example.com",
      "role": "USER",
      "isEmailVerified": true,
      "twoFactorEnabled": false,
      "lastLoginAt": "2026-04-20T10:00:00.000Z",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "profile": {
        "id": "uuid",
        "firstName": "Jane",
        "lastName": "Doe",
        "phone": null,
        "avatarUrl": "https://bucket.s3.us-east-1.amazonaws.com/avatars/uuid/f3a9b2c1.jpg",
        "resumeUrl": null,
        "headline": "Full Stack Developer",
        "summary": null,
        "location": "Dhaka, BD",
        "linkedinUrl": null,
        "githubUrl": "https://github.com/janedoe",
        "portfolioUrl": null,
        "skills": ["TypeScript", "Node.js", "React"],
        "experienceYears": 3
      },
      "subscription": {
        "plan": "FREE",
        "status": "ACTIVE",
        "currentPeriodEnd": null
      }
    }
  }
}
```

---

### PUT /user/profile

Updates the authenticated user's profile. All fields are optional — only send
what needs to change. Send an empty string `""` to clear an optional field
(phone, headline, URL fields etc.).

**Auth:** `Bearer <accessToken>` | Cookie  
**Role:** `USER`  
**Content-Type:** `application/json`

**Request body** (all fields optional):

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+8801712345678",
  "headline": "Senior Full Stack Developer",
  "summary": "Passionate developer with 3+ years of experience...",
  "location": "Dhaka, BD",
  "linkedinUrl": "https://linkedin.com/in/janedoe",
  "githubUrl": "https://github.com/janedoe",
  "portfolioUrl": "https://janedoe.dev",
  "skills": ["TypeScript", "Node.js", "React", "PostgreSQL"],
  "experienceYears": 4
}
```

**Field rules:**

| Field             | Type       | Constraint                                                    |
| ----------------- | ---------- | ------------------------------------------------------------- |
| `firstName`       | `string`   | 2–50 chars                                                    |
| `lastName`        | `string`   | 2–50 chars                                                    |
| `phone`           | `string`   | E.164 format (`+8801712345678`) or `""` to clear              |
| `headline`        | `string`   | Max 120 chars, or `""` to clear                               |
| `summary`         | `string`   | Max 2000 chars, or `""` to clear                              |
| `location`        | `string`   | Max 100 chars, or `""` to clear                               |
| `linkedinUrl`     | `string`   | Must be valid URL containing `linkedin.com`, or `""` to clear |
| `githubUrl`       | `string`   | Must be valid URL containing `github.com`, or `""` to clear   |
| `portfolioUrl`    | `string`   | Any valid URL, or `""` to clear                               |
| `skills`          | `string[]` | Max 30 items, each string max 50 chars                        |
| `experienceYears` | `number`   | Integer, 0–50                                                 |

> Extra fields not in this list are rejected (`400`) — the schema uses
> `.strict()`.

**Response `200`:**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": { "user": { "...full profile object..." } }
}
```

---

### POST /user/profile/avatar

Uploads a new avatar image. Replaces any existing avatar (old file is deleted
from S3).

**Auth:** `Bearer <accessToken>` | Cookie  
**Role:** `USER`  
**Content-Type:** `multipart/form-data`  
**Form field name:** `avatar`

**Accepted types:** `image/jpeg`, `image/jpg`, `image/png`, `image/webp`  
**Max size:** 2 MB

**Response `200`:**

```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatarUrl": "https://bucket.s3.us-east-1.amazonaws.com/avatars/uuid/9d1e4f2a.jpg"
  }
}
```

**Error `400`** if no file is attached, file type is wrong, or file exceeds 2
MB.

---

### POST /user/profile/resume

Uploads a new resume PDF. Replaces any existing resume (old file is deleted from
S3).

**Auth:** `Bearer <accessToken>` | Cookie  
**Role:** `USER`  
**Content-Type:** `multipart/form-data`  
**Form field name:** `resume`

**Accepted types:** `application/pdf` only  
**Max size:** 5 MB

**Response `200`:**

```json
{
  "success": true,
  "message": "Resume uploaded successfully",
  "data": {
    "resumeUrl": "https://bucket.s3.us-east-1.amazonaws.com/resumes/uuid/c2f8a3b1.pdf"
  }
}
```

**Error `400`** if no file is attached, file is not a PDF, or file exceeds 5 MB.

---

### DELETE /user/profile/resume

Removes the user's resume from both the database and S3.

**Auth:** `Bearer <accessToken>` | Cookie  
**Role:** `USER`

**Response `200`:**

```json
{
  "success": true,
  "message": "Resume deleted successfully",
  "data": null
}
```

**Error `400`** — "No resume found to delete" if `resumeUrl` is already `null`.

---

### PUT /user/change-password

Changes the user's password. On success, the current access token is blacklisted
in Redis and **all** refresh tokens for this user are revoked in the database —
forcing re-login on every device.

**Auth:** `Bearer <accessToken>` | Cookie  
**Role:** `USER`  
**Content-Type:** `application/json`

**Request body:**

```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@456",
  "confirmPassword": "NewPass@456"
}
```

**Password rules (same as registration):**

- Minimum 8 characters, maximum 128
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- `newPassword` must differ from `currentPassword`
- `confirmPassword` must match `newPassword`

**Response `200`:**

```json
{
  "success": true,
  "message": "Password changed successfully. Please log in again on all devices.",
  "data": null
}
```

**Side effects:** HttpOnly cookies (`access_token`, `refresh_token`) are cleared
in the response. The user must log in again.

**Error `401`** — "Current password is incorrect"

---

### DELETE /user/account

Soft-deactivates the user's own account. Sets `isActive = false` in the database
— data is retained. The user can be reactivated by an admin. All active sessions
are terminated.

**Auth:** `Bearer <accessToken>` | Cookie  
**Role:** `USER`  
**Content-Type:** `application/json`

**Request body:**

```json
{
  "password": "CurrentPass@123"
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Your account has been deactivated. We are sorry to see you go.",
  "data": null
}
```

**Side effects:** HttpOnly cookies are cleared. All refresh tokens revoked.
Access token blacklisted in Redis.

**Error `401`** — "Incorrect password"

---

## 3. Admin User Management APIs

All endpoints in this section require:

- A valid access token
- Role: `ADMIN`

---

### GET /admin/users

Lists all users with pagination and optional filtering. Runs a `COUNT` query in
parallel with the data query for accurate pagination metadata.

**Auth:** `Bearer <accessToken>` | Cookie  
**Role:** `ADMIN`

**Query parameters:**

| Param             | Type                                          | Default       | Description                                                 |
| ----------------- | --------------------------------------------- | ------------- | ----------------------------------------------------------- |
| `page`            | `integer`                                     | `1`           | Page number                                                 |
| `limit`           | `integer`                                     | `20`          | Items per page (max 100)                                    |
| `search`          | `string`                                      | —             | Case-insensitive search across email, first name, last name |
| `isActive`        | `"true"` \| `"false"`                         | —             | Filter by active status                                     |
| `isEmailVerified` | `"true"` \| `"false"`                         | —             | Filter by email verification status                         |
| `plan`            | `"FREE"` \| `"BASIC"` \| `"PREMIUM"`          | —             | Filter by subscription plan                                 |
| `sortBy`          | `"createdAt"` \| `"email"` \| `"lastLoginAt"` | `"createdAt"` | Sort field                                                  |
| `sortOrder`       | `"asc"` \| `"desc"`                           | `"desc"`      | Sort direction                                              |

**Example request:**

```
GET /admin/users?search=jane&isActive=true&plan=PREMIUM&sortBy=lastLoginAt&sortOrder=desc&page=1&limit=20
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "jane@example.com",
        "isActive": true,
        "isEmailVerified": true,
        "lastLoginAt": "2026-04-20T10:00:00.000Z",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "profile": {
          "firstName": "Jane",
          "lastName": "Doe",
          "avatarUrl": null
        },
        "subscription": {
          "plan": "PREMIUM"
        }
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### GET /admin/users/:id

Returns full detail for a single user including application count.

**Auth:** `Bearer <accessToken>` | Cookie  
**Role:** `ADMIN`

**URL param:** `id` — UUID

**Response `200`:**

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "jane@example.com",
      "role": "USER",
      "isActive": true,
      "isEmailVerified": true,
      "twoFactorEnabled": false,
      "lastLoginAt": "2026-04-20T10:00:00.000Z",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-04-20T10:00:00.000Z",
      "profile": {
        "firstName": "Jane",
        "lastName": "Doe",
        "avatarUrl": null,
        "resumeUrl": "https://bucket.s3.us-east-1.amazonaws.com/resumes/uuid/c2f8a3b1.pdf",
        "phone": "+8801712345678",
        "headline": "Full Stack Developer",
        "location": "Dhaka, BD",
        "skills": ["TypeScript", "Node.js"],
        "experienceYears": 3
      },
      "subscription": {
        "plan": "FREE",
        "status": "ACTIVE",
        "currentPeriodEnd": null
      },
      "_count": {
        "applications": 12
      }
    }
  }
}
```

**Error `400`** — "Invalid user ID" if `id` is not a valid UUID  
**Error `404`** — "User not found"

---

### PATCH /admin/users/:id/suspend

Sets the target user's `isActive` to `false` and immediately revokes all their
active refresh tokens — logging them out of every device. Their existing access
tokens remain valid until expiry (max 15 minutes), after which they cannot
refresh.

**Auth:** `Bearer <accessToken>` | Cookie  
**Role:** `ADMIN`

**URL param:** `id` — UUID of the user to suspend

**Request body** (optional):

```json
{
  "reason": "Violation of terms of service — posted fraudulent job listings"
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "User suspended successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "jane@example.com",
      "isActive": false
    }
  }
}
```

**Error `400`** — "User is already suspended"  
**Error `403`** — "You cannot suspend your own account"  
**Error `404`** — "User not found"

---

### PATCH /admin/users/:id/activate

Re-activates a previously suspended user by setting `isActive` to `true`. The
user must log in again themselves — no tokens are re-issued automatically.

**Auth:** `Bearer <accessToken>` | Cookie  
**Role:** `ADMIN`

**URL param:** `id` — UUID of the user to activate

**Request body** (optional):

```json
{
  "reason": "Appeal reviewed and approved"
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "User activated successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "jane@example.com",
      "isActive": true
    }
  }
}
```

**Error `400`** — "User is already active"  
**Error `403`** — "You cannot change the status of your own account"  
**Error `404`** — "User not found"

---

## 4. Validation Reference

All schemas live in `src/validations/user.validation.ts`.

| Schema                        | Used by                                    | Validates                                    |
| ----------------------------- | ------------------------------------------ | -------------------------------------------- |
| `updateProfileSchema`         | `PUT /user/profile`                        | body (strict — no extra keys)                |
| `deactivateAccountSchema`     | `DELETE /user/account`                     | body.password                                |
| `changePasswordSchema`        | `PUT /user/change-password`                | body (re-exported from `auth.validation.ts`) |
| `adminListUsersSchema`        | `GET /admin/users`                         | query params with coercion + defaults        |
| `userIdParamSchema`           | `GET /admin/users/:id`                     | params.id UUID                               |
| `adminUpdateUserStatusSchema` | `PATCH /admin/users/:id/suspend\|activate` | params.id UUID + optional body.reason        |

**Exported TypeScript types:**

```typescript
UpdateProfileInput;
DeactivateAccountInput;
AdminListUsersQuery;
AdminUpdateUserStatusInput;
```

---

## 5. S3 File Storage

Files are uploaded using `multer.memoryStorage()` — the buffer goes directly
from the request to S3, nothing is written to disk.

**S3 key structure:**

```
{bucket}/
├── avatars/
│   └── {userId}/
│       └── {8-byte-random-hex}.{ext}    e.g. avatars/abc123/f3a9b2c1.jpg
└── resumes/
    └── {userId}/
        └── {8-byte-random-hex}.pdf      e.g. resumes/abc123/9d1e4f2a.pdf
```

**Old file cleanup:** When a user uploads a new avatar or resume, the previous
S3 object is deleted using `void deleteFromS3(oldUrl)` — fire-and-forget, so a
failed S3 cleanup never blocks or fails the user's request.

**Upload service functions** (`src/services/upload.service.ts`):

| Function                         | Purpose                                                                |
| -------------------------------- | ---------------------------------------------------------------------- |
| `uploadAvatarToS3(userId, file)` | Validates mime/size, uploads, returns public URL                       |
| `uploadResumeToS3(userId, file)` | Validates mime/size, uploads as PDF, returns public URL                |
| `deleteFromS3(url)`              | Extracts S3 key from URL, calls `DeleteObjectCommand`, swallows errors |

**Multer middleware** (`src/middlewares/upload.ts`):

| Export                                    | Field name | Types                | Limit |
| ----------------------------------------- | ---------- | -------------------- | ----- |
| `uploadAvatarMiddleware.single('avatar')` | `avatar`   | jpeg, jpg, png, webp | 2 MB  |
| `uploadResumeMiddleware.single('resume')` | `resume`   | pdf                  | 5 MB  |

---

## 6. Security & Session Handling

### Password change

When a user changes their password:

1. Current access token's JTI is blacklisted in Redis with the token's remaining
   TTL
2. All refresh tokens for the user are revoked in the database
   (`isRevoked = true`)
3. The provided refresh token cookie is also explicitly revoked
   (belt-and-suspenders)
4. HttpOnly cookies `access_token` and `refresh_token` are cleared in the
   response

### Account deactivation (self)

1. `isActive` set to `false` (soft delete — data retained)
2. All refresh tokens revoked
3. Access token JTI blacklisted in Redis
4. HttpOnly cookies cleared

### Admin suspend

1. Target user's `isActive` set to `false`
2. All active refresh tokens revoked — user is kicked off every device within
   the access token TTL (15 min max)
3. The suspended user's next API call with an access token that has not yet
   expired will succeed (unavoidable — this is the JWT tradeoff). After 15 min,
   they cannot refresh and are fully locked out.

### Guards

- An admin cannot suspend or activate their own account (`ForbiddenError`)
- Suspending an already-suspended user returns `BadRequestError` (not silent)
- Activating an already-active user returns `BadRequestError` (not silent)

---

## 7. Error Reference

All errors follow the standard response format:

```json
{
  "success": false,
  "message": "Human readable message",
  "errors": [{ "field": "fieldName", "message": "what went wrong" }]
}
```

| Status | Scenario                                              |
| ------ | ----------------------------------------------------- |
| `400`  | Validation failed (Zod) — includes `errors` array     |
| `400`  | No resume found to delete                             |
| `400`  | User already suspended / already active               |
| `400`  | File type not allowed or file too large               |
| `401`  | Access token missing, expired, or revoked             |
| `401`  | Current password incorrect (change password)          |
| `401`  | Incorrect password (deactivate account)               |
| `403`  | Role not permitted (`USER` hitting admin route, etc.) |
| `403`  | Admin trying to suspend/activate own account          |
| `404`  | User not found                                        |

---

## 8. Route Mounting

`src/routes/index.ts` was updated to mount the new routers:

```typescript
// Auth (existing)
router.use('/auth/user', userAuthRoutes);
router.use('/auth/org', orgAuthRoutes);
router.use('/auth/admin', adminAuthRoutes);

// Phase 3c additions
router.use('/user', userRoutes); // → GET/PUT /profile, POST /profile/avatar, etc.
router.use('/admin', adminRoutes); // → GET /users, PATCH /users/:id/suspend, etc.
```

Full API path examples:

```
GET  /api/v1/user/profile
PUT  /api/v1/user/profile
POST /api/v1/user/profile/avatar
POST /api/v1/user/profile/resume
DEL  /api/v1/user/profile/resume
PUT  /api/v1/user/change-password
DEL  /api/v1/user/account

GET   /api/v1/admin/users
GET   /api/v1/admin/users/:id
PATCH /api/v1/admin/users/:id/suspend
PATCH /api/v1/admin/users/:id/activate
```

`admin.routes.ts` is structured with a comment placeholder at the bottom for
Phase 3d+ additions (org management, jobs moderation, payments, subscriptions).

---

## What's Next — Phase 3d

Based on the roadmap, the next phase will cover:

- Org profile APIs (`GET /org/profile`, `PUT /org/profile`,
  `POST /org/profile/logo`)
- Admin org management (`GET /admin/organizations`,
  `PATCH /admin/organizations/:id/approve`,
  `PATCH /admin/organizations/:id/suspend`)
- Job CRUD for organizations
- Public job search

These will extend `admin.routes.ts` with additional route groups and introduce
new service/controller/validation files following the exact same conventions
established here.
