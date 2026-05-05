# 📋 Phase 3E — Application Flow (Full Production Design)

# CareerArch | FINAL PLAN — Ready for Implementation

> Status: **APPROVED FOR IMPLEMENTATION** Scope: User applies → Org manages
> pipeline → Status updates via WebSocket → Hiring incentive triggered on HIRED
> → Full notification trail Stack: Express 5 · Prisma 7 · Socket.IO · BullMQ ·
> Zod 4 · Stripe

---

## 1. Scope & What This Phase Covers

| Area                           | Included         |
| ------------------------------ | ---------------- |
| User applies to a job          | ✅               |
| Plan gating on apply           | ✅               |
| Duplicate apply guard          | ✅               |
| Resume override on apply       | ✅               |
| Email to user on apply         | ✅               |
| Email to org on apply          | ✅               |
| User views own applications    | ✅               |
| User withdraws application     | ✅               |
| Org fetches applications       | ✅               |
| Org updates application status | ✅               |
| Real-time status via Socket.IO | ✅               |
| User notified on status change | ✅ (DB + Socket) |
| HIRED triggers incentive       | ✅               |
| User saves / unsaves a job     | ✅               |
| User views saved jobs          | ✅               |
| Org views applications per job | ✅               |
| Public job search (basic)      | ✅               |
| Public job detail by slug      | ✅               |

**NOT in this phase:**

- Stripe payment for incentive (separate phase — org.incentive.service.ts)
- AI resume tips (PREMIUM feature, future)
- Application analytics dashboard charts

---

## 2. Architecture Overview

```
USER                              SERVER                          ORG
  │                                  │                              │
  │── POST /applications ──────────► │                              │
  │                                  │ Guard: plan, duplicate, job  │
  │                                  │ Insert Application (PENDING) │
  │                                  │ Increment applyCountThisMonth│
  │                                  │ Send email (user + org)      │
  │◄── 201 { application } ──────────│                              │
  │                                  │                              │
  │── WS: connect + join room ──────►│                              │
  │   "user:{userId}"                │                              │
  │                                  │                              │
  │                                  │◄── PATCH /org/applications/:id/status ──
  │                                  │ Validate status transition   │
  │                                  │ Update DB                    │
  │                                  │ Create Notification (DB)     │
  │                                  │ Emit WS event to user room   │
  │◄── WS: application:status_updated│ Send email to user           │
  │   { applicationId, newStatus }   │                              │
  │                                  │ If status === HIRED:         │
  │                                  │   Create HiringIncentive     │
  │                                  │   Update org.hasUnpaidIncentives=true
  │                                  │   Emit WS to org room        │
  │                                  │◄── WS: incentive:created     │
```

---

## 3. Status Transition Rules

```
PENDING
  ├──► UNDER_REVIEW    (org action)
  └──► REJECTED        (org action, or auto on job close)
  └──► WITHDRAWN       (user action)

UNDER_REVIEW
  ├──► SHORTLISTED     (org)
  ├──► REJECTED        (org)
  └──► WITHDRAWN       (user — only if not yet shortlisted)

SHORTLISTED
  ├──► INTERVIEW_SCHEDULED  (org)
  ├──► REJECTED             (org)
  └──► WITHDRAWN            (user — NOT allowed once shortlisted)

INTERVIEW_SCHEDULED
  ├──► OFFERED         (org)
  ├──► REJECTED        (org)

OFFERED
  ├──► HIRED           (org — triggers $50 incentive)
  ├──► REJECTED        (org)

HIRED       → terminal
REJECTED    → terminal
WITHDRAWN   → terminal (user-initiated)
```

**Guards:**

- User can only withdraw if status is `PENDING` or `UNDER_REVIEW`
- Org cannot move a `WITHDRAWN` application forward
- Once `HIRED` / `REJECTED` — no further status changes allowed
- Org cannot set status to `WITHDRAWN` (user-only)

---

## 4. Real-Time Strategy — Socket.IO

### Why Socket.IO over raw WebSocket

- Handles reconnection, namespaces, rooms natively
- Works behind Render's reverse proxy (long polling fallback)
- Simpler room management for user/org scoping

### Room Naming Convention

```
user:{userId}     → user receives own application status updates
org:{orgId}       → org receives new application notifications + incentive alerts
admin:{adminId}   → admin receives platform-level events (future)
```

### Events Emitted (server → client)

| Event                        | Room            | Payload                                                               |
| ---------------------------- | --------------- | --------------------------------------------------------------------- |
| `application:new`            | `org:{orgId}`   | `{ applicationId, jobTitle, candidateName, appliedAt }`               |
| `application:status_updated` | `user:{userId}` | `{ applicationId, jobId, jobTitle, oldStatus, newStatus, updatedAt }` |
| `application:withdrawn`      | `org:{orgId}`   | `{ applicationId, jobTitle, candidateName }`                          |
| `incentive:created`          | `org:{orgId}`   | `{ incentiveId, amount, candidateName, jobTitle, dueAt }`             |
| `notification:new`           | `user:{userId}` | `{ id, title, message, link }`                                        |

### Connection Auth (Socket.IO middleware)

```typescript
// Client sends token in handshake auth:
// socket = io(SERVER_URL, { auth: { token: "Bearer xxx" } })

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token?.replace('Bearer ', '');
  if (!token) return next(new Error('Unauthorized'));

  const decoded = verifyAccessToken(token);
  const blacklisted = await redis.get(RedisKeys.blacklistToken(decoded.jti));
  if (blacklisted) return next(new Error('Token revoked'));

  socket.data.user = decoded; // attach payload to socket
  next();
});
```

### Client joins their room on connect

```typescript
io.on('connection', (socket) => {
  const { sub, role } = socket.data.user;

  if (role === 'USER') socket.join(`user:${sub}`);
  if (role === 'ORGANIZATION') socket.join(`org:${sub}`);
  if (role === 'ADMIN') socket.join(`admin:${sub}`);

  socket.on('disconnect', () => {
    /* cleanup if needed */
  });
});
```

---

## 5. Database — No Schema Changes Required

All models already exist in `schema.prisma`:

- `Application` — holds all application data
- `HiringIncentive` — auto-created on HIRED
- `Notification` — stores per-user/org notifications
- `SavedJob` — user saves jobs

The only **counter fields** that get mutated:

| Model          | Field                 | When                                      |
| -------------- | --------------------- | ----------------------------------------- |
| `Subscription` | `applyCountThisMonth` | +1 on successful application              |
| `Subscription` | `savedJobCount`       | +1 on save, -1 on unsave                  |
| `Organization` | `hasUnpaidIncentives` | set true on HIRED                         |
| `Job`          | `views`               | +1 on public job detail fetch (debounced) |

---

## 6. API Endpoints

### 6a. User — Applications

| Method | Endpoint            | Auth    | Middleware                    | Description                       |
| ------ | ------------------- | ------- | ----------------------------- | --------------------------------- |
| POST   | `/applications`     | ✅ USER | checkApplyLimit, checkJobPlan | Apply to a job                    |
| GET    | `/applications`     | ✅ USER | —                             | List own applications (paginated) |
| GET    | `/applications/:id` | ✅ USER | —                             | Get single application detail     |
| DELETE | `/applications/:id` | ✅ USER | —                             | Withdraw application              |

### 6b. User — Saved Jobs

| Method | Endpoint           | Auth    | Middleware        | Description     |
| ------ | ------------------ | ------- | ----------------- | --------------- |
| POST   | `/jobs/:id/save`   | ✅ USER | checkSaveJobLimit | Save a job      |
| DELETE | `/jobs/:id/save`   | ✅ USER | —                 | Unsave a job    |
| GET    | `/user/saved-jobs` | ✅ USER | —                 | List saved jobs |

### 6c. Organization — Application Management

| Method | Endpoint                        | Auth   | Description                           |
| ------ | ------------------------------- | ------ | ------------------------------------- |
| GET    | `/org/jobs/:jobId/applications` | ✅ ORG | List all applications for a job       |
| GET    | `/org/applications`             | ✅ ORG | List all applications across all jobs |
| GET    | `/org/applications/:id`         | ✅ ORG | Get single application detail         |
| PATCH  | `/org/applications/:id/status`  | ✅ ORG | Update application status             |

### 6d. Public — Job Discovery

| Method | Endpoint           | Auth               | Description                                  |
| ------ | ------------------ | ------------------ | -------------------------------------------- |
| GET    | `/jobs`            | ❌ (optional auth) | Public job search with filters + plan gating |
| GET    | `/jobs/:slug`      | ❌ (optional auth) | Public job detail (increments views)         |
| GET    | `/jobs/categories` | ❌                 | List all distinct job categories             |

---

## 7. Validation Schemas (Zod)

### `application.validation.ts`

```typescript
// POST /applications
createApplicationSchema = z.object({
  body: z.object({
    jobId: z.string().uuid('Invalid job ID'),
    coverLetter: z.string().trim().max(5000).optional(),
    resumeUrl: z.string().url().optional(),  // overrides profile resume
    answers: z.record(z.string(), z.string()).optional(), // screening Qs
  })
})

// PATCH /org/applications/:id/status
updateApplicationStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum([
      'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED',
      'OFFERED', 'HIRED', 'REJECTED'
    ]),
    notes: z.string().trim().max(2000).optional(),
  })
})

// GET /applications (user) + GET /org/applications
listApplicationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum([...ApplicationStatus values...]).optional(),
    jobId: z.string().uuid().optional(),
    sortBy: z.enum(['appliedAt', 'updatedAt']).default('appliedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
})

// GET /org/jobs/:jobId/applications
listJobApplicationsSchema = z.object({
  params: z.object({ jobId: z.string().uuid() }),
  query: z.object({ ...same pagination shape... })
})
```

### `public.jobs.validation.ts`

```typescript
publicJobSearchSchema = z.object({
  query: z.object({
    q: z.string().trim().max(200).optional(),           // keyword
    location: z.string().trim().max(200).optional(),
    type: z.enum([...JobType...]).optional(),
    category: z.string().trim().max(100).optional(),
    experienceLevel: z.enum(['Entry','Junior','Mid','Senior','Lead']).optional(),
    salaryMin: z.coerce.number().positive().optional(),
    salaryMax: z.coerce.number().positive().optional(),
    isRemote: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    sortBy: z.enum(['createdAt', 'publishedAt', 'salaryMax']).default('publishedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
})
```

---

## 8. Service Layer — Full Business Logic

### `application.service.ts`

#### `createApplication(userId, data)`

```
1. Load job by jobId
   → NotFoundError if not found
   → BadRequestError if status !== 'PUBLISHED'
   → BadRequestError if deadline passed

2. Load user subscription
   → Check plan hierarchy: user.plan >= job.requiredPlan
   → ForbiddenError if plan too low:
      "This job requires a {BASIC/PREMIUM} plan. Upgrade to apply."

3. Check duplicate:
   → ConflictError if Application exists with same [jobId, userId]

4. Resolve resumeUrl:
   → data.resumeUrl ?? userProfile.resumeUrl ?? null

5. Create Application (status = PENDING)

6. Increment subscription.applyCountThisMonth += 1 (already guarded by checkApplyLimit middleware)

7. Emit Socket event to org:
   io.to(`org:${job.orgId}`).emit('application:new', { ... })

8. Create Notification for org (DB):
   { orgId: job.orgId, title: "New Application", message: "...", link: "/org/applications/:id" }

9. Queue emails (BullMQ):
   → sendApplicationConfirmationUser(user.email, ...)
   → sendApplicationReceivedOrg(org.email, ...)
   (Email is async — never blocks the response)

10. Return 201 { application }
```

#### `withdrawApplication(userId, applicationId)`

```
1. Find application where id = applicationId AND userId = userId
   → NotFoundError if not found

2. Guard status:
   → BadRequestError if status NOT IN ['PENDING', 'UNDER_REVIEW']
      "You can only withdraw an application that hasn't been shortlisted yet."

3. Update status = 'WITHDRAWN'

4. Emit Socket event to org:
   io.to(`org:${job.orgId}`).emit('application:withdrawn', { ... })

5. Return 200
```

#### `updateApplicationStatus(orgId, applicationId, newStatus, notes?)`

```
1. Find application (join job to verify job.orgId === orgId)
   → NotFoundError if not found or wrong org

2. Validate transition (see §3 — Status Transition Rules):
   → BadRequestError on invalid transition

3. Update application:
   { status: newStatus, notes: notes ?? existing.notes, updatedAt: now() }

4. Update emailSentToUser = false (reset, so email sends again)

5. Create Notification for user (DB):
   {
     userId: application.userId,
     title: statusToNotificationTitle(newStatus),
     message: "Your application for {jobTitle} at {companyName} has been {status}",
     link: "/dashboard/user/applications/{applicationId}"
   }

6. Emit Socket event to user:
   io.to(`user:${application.userId}`).emit('application:status_updated', {
     applicationId,
     jobId: application.jobId,
     jobTitle: job.title,
     oldStatus: prevStatus,
     newStatus,
     updatedAt: new Date()
   })

7. Queue email to user (BullMQ):
   sendApplicationStatusUpdateEmail(...)

8. If newStatus === 'HIRED':
   → Call createHiringIncentive(orgId, job.id, applicationId)
   → See §8 Incentive Creation below

9. Return 200 { application }
```

#### `createHiringIncentive(orgId, jobId, applicationId)`

```
1. Check no incentive already exists for applicationId
   → idempotency guard

2. Calculate dueAt = now() + 7 days

3. Create HiringIncentive:
   {
     orgId, jobId, applicationId,
     amount: INCENTIVE_AMOUNT_CENTS / 100,   // $50
     currency: 'USD',
     status: 'PENDING',
     dueAt
   }

4. Update Organization:
   { hasUnpaidIncentives: true }

5. Emit Socket event to org:
   io.to(`org:${orgId}`).emit('incentive:created', {
     incentiveId, amount: 50, candidateName, jobTitle, dueAt
   })

6. Create Notification for org (DB):
   {
     orgId,
     title: "Hiring Incentive Due",
     message: "$50 incentive due for hiring {candidateName} — pay within 7 days",
     link: "/org/incentives"
   }
```

### `public.job.service.ts`

#### `searchPublicJobs(user | null, query)`

```
1. Build where clause:
   - status = 'PUBLISHED'
   - deadline > now() OR deadline is null
   - keyword (title OR skills OR category ILIKE %q%)
   - location ILIKE %location% (if provided)
   - jobType (if provided)
   - isRemote (if provided)
   - salaryMin / salaryMax range
   - experienceLevel

2. Plan-based visibility (FREE gating):
   If user is null OR user.plan = 'FREE':
     - Only show jobs where requiredPlan = 'FREE'
     - Cap results at 20 (ignore pagination beyond page 1)
     - Add meta.isLimited = true, meta.limitMessage = "Upgrade to see all jobs"
   If user.plan = 'BASIC':
     - Show FREE + BASIC jobs
   If user.plan = 'PREMIUM':
     - Show all jobs

3. Include org profile (companyName, logoUrl) in response

4. Return paginated results + meta
```

#### `getPublicJobBySlug(slug, userId?)`

```
1. Find job where slug = slug AND status = 'PUBLISHED'
   → NotFoundError if not found

2. Increment views += 1 (fire-and-forget, no await)

3. If userId provided:
   → Check if user has already applied (isSaved, isApplied flags in response)

4. Return full job detail + org profile
```

### `saved.job.service.ts`

#### `saveJob(userId, jobId)`

```
1. Verify job exists and is PUBLISHED
2. Check duplicate: ConflictError if already saved
3. Create SavedJob
4. Increment subscription.savedJobCount += 1
   (already guarded by checkSaveJobLimit middleware)
5. Return 201
```

#### `unsaveJob(userId, jobId)`

```
1. Find SavedJob where userId + jobId
   → NotFoundError if not found
2. Delete SavedJob
3. Decrement subscription.savedJobCount -= 1 (floor at 0)
4. Return 200
```

---

## 9. New Middleware — `checkJobPlan`

Applied on `POST /applications`, runs AFTER `checkApplyLimit`.

```typescript
// src/middlewares/checkJobPlan.ts

export const checkJobPlan: RequestHandler = async (req, res, next) => {
  const { sub } = (req as IAuthenticatedRequest).user;
  const { jobId } = req.body as { jobId: string };

  const [job, subscription] = await Promise.all([
    prisma.job.findUnique({
      where: { id: jobId },
      select: { requiredPlan: true, status: true },
    }),
    prisma.subscription.findUnique({
      where: { userId: sub },
      select: { plan: true },
    }),
  ]);

  if (job === null) {
    sendError(res, 'Job not found', 404);
    return;
  }

  if (job.status !== 'PUBLISHED') {
    sendError(res, 'This job is no longer accepting applications', 400);
    return;
  }

  const PLAN_HIERARCHY = { FREE: 0, BASIC: 1, PREMIUM: 2 };
  const userLevel = PLAN_HIERARCHY[subscription?.plan ?? 'FREE'];
  const requiredLevel = PLAN_HIERARCHY[job.requiredPlan];

  if (userLevel < requiredLevel) {
    sendError(
      res,
      `This job requires a ${job.requiredPlan} plan. Upgrade to apply.`,
      403,
      [{ field: 'plan', message: 'Plan upgrade required to apply' }],
    );
    return;
  }

  next();
};
```

---

## 10. Socket.IO Setup

### New file: `src/config/socket.ts`

```typescript
import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'http';

let io: SocketServer;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
    },
    transports: ['websocket', 'polling'], // polling fallback for Render
  });

  // Auth middleware
  io.use(socketAuthMiddleware);

  // Room joining
  io.on('connection', (socket) => {
    const { sub, role } = socket.data.user as IJwtPayload;

    if (role === 'USER') socket.join(`user:${sub}`);
    if (role === 'ORGANIZATION') socket.join(`org:${sub}`);

    socket.on('disconnect', () => {
      // ioredis cleans up automatically
    });
  });

  return io;
}

// Singleton getter — used in services to emit events
export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
```

### Server startup change (`server.ts`)

```typescript
// Instead of: app.listen(PORT, ...)
// Use:
import http from 'http';
import { initSocket } from '@config/socket';

const httpServer = http.createServer(app);
initSocket(httpServer);
httpServer.listen(PORT, () => { ... });
```

---

## 11. Email Templates Required

| Template File                     | Trigger                   | Variables                                                                  |
| --------------------------------- | ------------------------- | -------------------------------------------------------------------------- |
| `application-submitted-user.html` | User applies              | FIRST_NAME, JOB_TITLE, COMPANY_NAME, APPLIED_DATE, DASHBOARD_URL           |
| `application-submitted-org.html`  | User applies (notify org) | COMPANY_NAME, CANDIDATE_NAME, JOB_TITLE, APPLIED_DATE, APPLICATION_URL     |
| `application-status-update.html`  | Org changes status        | FIRST_NAME, JOB_TITLE, COMPANY_NAME, STATUS, STATUS_MESSAGE, DASHBOARD_URL |

**Status messages** for `application-status-update.html`:

| Status              | Subject line                             | Body message                                     |
| ------------------- | ---------------------------------------- | ------------------------------------------------ |
| UNDER_REVIEW        | 🔍 Your application is under review      | "We're reviewing your application..."            |
| SHORTLISTED         | 🎉 Great news — you've been shortlisted! | "You've been shortlisted for an interview..."    |
| INTERVIEW_SCHEDULED | 📅 Interview scheduled — {JOB_TITLE}     | "An interview has been scheduled..."             |
| OFFERED             | 🏆 You've received an offer!             | "Congratulations! You have received an offer..." |
| HIRED               | 🎊 Congratulations — you're hired!       | "We are thrilled to welcome you..."              |
| REJECTED            | Application update — {JOB_TITLE}         | "After careful consideration..."                 |

---

## 12. Notification System (DB-backed)

Every status change creates a `Notification` row in DB. The `GET /notifications`
endpoint returns them. The Socket.IO `notification:new` event is also fired
simultaneously so the frontend badge updates in real-time without polling.

### Notification titles by status

```typescript
const STATUS_NOTIFICATION_MAP: Record<
  ApplicationStatus,
  { title: string; message: string }
> = {
  UNDER_REVIEW: {
    title: 'Application Under Review',
    message: 'Your application for {job} is being reviewed',
  },
  SHORTLISTED: {
    title: "You've Been Shortlisted! 🎉",
    message: 'Great news! You were shortlisted for {job}',
  },
  INTERVIEW_SCHEDULED: {
    title: 'Interview Scheduled 📅',
    message: 'An interview has been arranged for {job}',
  },
  OFFERED: {
    title: 'Offer Received! 🏆',
    message: 'You received a job offer for {job}',
  },
  HIRED: {
    title: "You're Hired! 🎊",
    message: 'Congratulations! You got the job at {company}',
  },
  REJECTED: {
    title: 'Application Update',
    message: 'An update on your application for {job}',
  },
  WITHDRAWN: {
    title: 'Application Withdrawn',
    message: 'You withdrew your application for {job}',
  },
  PENDING: {
    title: 'Application Submitted',
    message: 'Your application for {job} has been submitted',
  },
};
```

---

## 13. BullMQ Email Queue Integration

Emails are never sent synchronously inside controllers. Every send goes through
the email queue:

```typescript
// src/jobs/queues/email.queue.ts (extend existing)

export const emailQueue = new Queue('emails', { connection: redis });

// Usage inside services:
await emailQueue.add('send-email', {
  template: 'application-submitted-user',
  to: user.email,
  subject: `✅ Application Submitted — ${jobTitle} at ${companyName}`,
  variables: { FIRST_NAME: firstName, JOB_TITLE: jobTitle, ... }
});
```

---

## 14. Response Shapes

### `POST /applications` → `201 Created`

```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "application": {
      "id": "uuid",
      "jobId": "uuid",
      "userId": "uuid",
      "status": "PENDING",
      "coverLetter": "...",
      "resumeUrl": "https://...",
      "appliedAt": "2026-05-01T12:00:00Z"
    }
  }
}
```

### `GET /applications` → `200 OK`

```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "uuid",
        "status": "SHORTLISTED",
        "appliedAt": "...",
        "updatedAt": "...",
        "job": {
          "id": "uuid",
          "title": "Senior Backend Engineer",
          "slug": "senior-backend-engineer-a1b2c3",
          "location": "New York, NY",
          "isRemote": true,
          "salaryMin": 120000,
          "salaryMax": 160000,
          "organization": {
            "profile": {
              "companyName": "TechCorp Inc.",
              "logoUrl": "https://..."
            }
          }
        }
      }
    ]
  },
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1, ... }
}
```

### `PATCH /org/applications/:id/status` → `200 OK`

```json
{
  "success": true,
  "message": "Application status updated to SHORTLISTED",
  "data": {
    "application": {
      "id": "uuid",
      "status": "SHORTLISTED",
      "notes": "Strong TypeScript background, schedule interview",
      "updatedAt": "..."
    }
  }
}
```

### `GET /jobs` (public) — FREE user → `200 OK`

```json
{
  "success": true,
  "data": { "jobs": ["...up to 20 FREE-tier jobs..."] },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 20,
    "totalPages": 1,
    "isLimited": true,
    "limitMessage": "Upgrade to Basic to see all jobs"
  }
}
```

### Plan gating error on apply → `403`

```json
{
  "success": false,
  "message": "This job requires a BASIC plan. Upgrade to apply.",
  "errors": [{ "field": "plan", "message": "Plan upgrade required to apply" }]
}
```

### Duplicate application → `409`

```json
{
  "success": false,
  "message": "You have already applied to this job"
}
```

---

## 15. Files to Create / Modify

### New files

```
src/
├── config/
│   └── socket.ts                         ← Socket.IO init + auth middleware
├── validations/
│   ├── application.validation.ts         ← all Zod schemas
│   └── public.jobs.validation.ts         ← public search schema
├── services/
│   ├── application/
│   │   └── application.service.ts        ← apply, withdraw, list, get
│   ├── jobs/
│   │   └── public.job.service.ts         ← search, detail, categories
│   └── saved/
│       └── saved.job.service.ts          ← save, unsave, list
├── controllers/
│   ├── application/
│   │   ├── user.application.controller.ts
│   │   └── org.application.controller.ts
│   ├── jobs/
│   │   └── public.job.controller.ts
│   └── saved/
│       └── saved.job.controller.ts
├── middlewares/
│   └── checkJobPlan.ts                   ← plan-based apply guard
├── routes/
│   ├── application/
│   │   └── application.routes.ts         ← user routes (POST, GET, DELETE)
│   ├── jobs/
│   │   └── public.job.routes.ts          ← public GET /jobs, GET /jobs/:slug
│   └── org/
│       └── org.application.routes.ts     ← org PATCH status, GET lists
├── jobs/
│   ├── queues/
│   │   └── email.queue.ts                ← new BullMQ email queue (extend)
│   └── workers/
│       └── email.worker.ts               ← processes email queue jobs
└── templates/emails/
    ├── application-submitted-user.html
    ├── application-submitted-org.html
    └── application-status-update.html
```

### Modified files

```
src/server.ts              ← switch to http.createServer + initSocket
src/routes/index.ts        ← mount 3 new route groups
src/routes/user/user.routes.ts  ← add GET /user/saved-jobs
src/routes/org/org.routes.ts    ← already has /jobs; add application sub-routes
src/services/email.service.ts   ← add sendApplicationStatusUpdateEmail
```

---

## 16. New npm Dependency

```bash
npm install socket.io
npm install --save-dev @types/socket.io  # usually bundled
```

Only one new package. `socket.io` includes its own TypeScript types.

---

## 17. Implementation Order

```
1. npm install socket.io

2. src/config/socket.ts
   — Socket server init + JWT auth middleware + room joining

3. src/server.ts
   — Switch app.listen → http.createServer + initSocket

4. src/validations/application.validation.ts
   — createApplicationSchema, updateApplicationStatusSchema, listApplicationsSchema

5. src/validations/public.jobs.validation.ts
   — publicJobSearchSchema, jobSlugParamSchema

6. src/middlewares/checkJobPlan.ts
   — plan-based apply guard

7. src/services/application/application.service.ts
   — createApplication (full flow with Socket emit)
   — withdrawApplication
   — updateApplicationStatus (full flow with Socket emit + incentive trigger)
   — listUserApplications
   — getUserApplication
   — listOrgApplications (per-job + all)
   — getOrgApplication

8. src/services/jobs/public.job.service.ts
   — searchPublicJobs (with plan gating)
   — getPublicJobBySlug (with views increment)
   — getJobCategories

9. src/services/saved/saved.job.service.ts
   — saveJob, unsaveJob, listSavedJobs

10. src/jobs/queues/email.queue.ts + workers/email.worker.ts

11. 3 email HTML templates

12. src/services/email.service.ts
    — Add sendApplicationStatusUpdateEmail

13. Controllers (thin — just call service + sendSuccess)

14. Routes + mount in index.ts

15. Integration tests
    — Apply flow (success, duplicate, plan guard)
    — Status update flow (valid + invalid transitions)
    — Save/unsave flow
    — Public job search (plan gating)
```

---

## 18. Testing Plan

### Integration tests

| Test file                 | Scenarios                                                          |
| ------------------------- | ------------------------------------------------------------------ |
| `application.test.ts`     | Apply success, duplicate, plan guard, withdraw, status transitions |
| `public.job.test.ts`      | Search with filters, plan gating (FREE), job detail, categories    |
| `saved.job.test.ts`       | Save, duplicate save, unsave, list, limit guard                    |
| `org.application.test.ts` | Org fetch list, status update, invalid transition, HIRED trigger   |

### Socket.IO tests (unit)

- Mock `getIO()` to return a spy
- Verify correct room receives correct event after `updateApplicationStatus`
- Verify incentive created + org notified on HIRED

---

## 19. Key Decisions & Rationale

| Decision                                        | What                                                    | Why                                                                   |
| ----------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| Socket.IO over raw WS                           | Use `socket.io` library                                 | Handles Render proxy, reconnection, rooms automatically               |
| Single `getIO()` singleton                      | `io` instance stored in `socket.ts` module              | Avoids passing `io` down through every service call                   |
| Email via BullMQ queue                          | Never `await sendEmail()` directly in service           | Email failure never fails the API response                            |
| Notification in DB + Socket emit                | Write to `Notification` table AND emit WS event         | User gets real-time badge update AND has persistent notification list |
| User withdraw guard (PENDING/UNDER_REVIEW only) | Cannot withdraw if SHORTLISTED+                         | Mirrors Glassdoor — org already invested time shortlisting            |
| HIRED → incentive auto-created                  | `updateApplicationStatus` calls `createHiringIncentive` | Atomic — incentive always exists when status is HIRED                 |
| `hasUnpaidIncentives` denormalized              | Boolean on `Organization`                               | `requireOrgReady` middleware can check in O(1) without counting table |
| Views increment fire-and-forget                 | `void prisma.job.update(...)` — no await                | Never blocks job detail response for a counter                        |
| Plan gating in service layer                    | `searchPublicJobs` reads subscription.plan              | Centralized — not scattered across routes/middleware                  |
