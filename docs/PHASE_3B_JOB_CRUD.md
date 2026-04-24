# 🏗️ Phase 3b — Job CRUD (Organization Side)

> **Status:** Planning — Approved, ready to implement  
> **Depends on:** Phase 2 Auth (Complete), Prisma schema (Complete)  
> **Target:** Full Job lifecycle management for Organizations

---

## Scope

This phase covers everything an Organization needs to manage job postings:

- Create / Read / Update / Delete jobs (soft delete with auto-expiry)
- Publish / Close job lifecycle
- Slug generation (SEO-stable)
- Plan-gating (`requiredPlan` field on jobs) — permission control deferred
- HTML sanitization via `isomorphic-dompurify`
- Input validation (Zod)
- Swagger JSDoc annotations

**NOT in scope for 3b:**

- Public job search (3c)
- Applications (3d)
- Stripe (3e)
- Plan-based job visibility for guest/free users (future — see scalability
  notes)

---

## Endpoints

| Method | Endpoint                | Auth            | Description                             |
| ------ | ----------------------- | --------------- | --------------------------------------- |
| POST   | `/org/jobs`             | ✅ ORGANIZATION | Create a new job (DRAFT)                |
| GET    | `/org/jobs`             | ✅ ORGANIZATION | List own jobs (paginated)               |
| GET    | `/org/jobs/deleted`     | ✅ ORGANIZATION | List soft-deleted jobs (trash view)     |
| GET    | `/org/jobs/:id`         | ✅ ORGANIZATION | Get single job detail                   |
| PUT    | `/org/jobs/:id`         | ✅ ORGANIZATION | Update job (any field)                  |
| DELETE | `/org/jobs/:id`         | ✅ ORGANIZATION | Soft delete → moves to DeletedJob       |
| PATCH  | `/org/jobs/:id/publish` | ✅ ORGANIZATION | Publish a DRAFT or CLOSED job           |
| PATCH  | `/org/jobs/:id/close`   | ✅ ORGANIZATION | Close a PUBLISHED job                   |
| PATCH  | `/org/jobs/:id/restore` | ✅ ORGANIZATION | Restore a soft-deleted job (within TTL) |

**Visibility rule:** Org job endpoints are NEVER exposed to guest users or other
orgs. Only the owning org and ADMIN can access org-scoped job endpoints. Public
job listing (3c) will have its own separate access control layer.

---

## Data Flow

### POST `/org/jobs` — Create Job

```
Request body (validated by Zod)
        │
        ▼
Org must be approved (isApproved = true)
  → ForbiddenError("Your organization is pending admin approval")
        │
        ▼
Sanitize description/requirements/responsibilities HTML
  via isomorphic-dompurify (strips XSS, keeps TipTap-safe tags)
        │
        ▼
Generate SEO slug from title
  "Senior React Developer" → "senior-react-developer-a1b2c3"
  (suffix via crypto.randomBytes — no new dep needed)
        │
        ▼
Create Job record (status = DRAFT, publishedAt = null)
        │
        ▼
Return 201 { job }
```

### PATCH `/org/jobs/:id/publish` — Publish Job

```
Find job by id (verify job.orgId === req.user.sub)
        │
        ▼
Status must be DRAFT or CLOSED
  → BadRequestError("Job is already published")
  → BadRequestError("Archived jobs cannot be published — restore first")
        │
        ▼
Validate minimum required fields:
  - title, description, jobType
  - location set OR isRemote = true
        │
        ▼
Update: status = PUBLISHED, publishedAt = now()
        │
        ▼
Return 200 { job }
```

### PATCH `/org/jobs/:id/close` — Close Job

```
Find job by id (verify ownership)
        │
        ▼
Status must be PUBLISHED
  → BadRequestError if not
        │
        ▼
Update: status = CLOSED
        │
        ▼
Return 200 { job }
```

### DELETE `/org/jobs/:id` — Soft Delete

```
Find job by id (verify ownership)
        │
        ▼
Status must be DRAFT or CLOSED
  → BadRequestError("Close the job before deleting it")
        │
        ▼
Prisma transaction:
  1. Insert full job snapshot → DeletedJob table
       { jobId, orgId, snapshot: job as JSON, deleteAt: now() + 30 days }
  2. Update Job: status = ARCHIVED
       (invisible to all public endpoints, still exists for restore)
        │
        ▼
Return 200 { message: "Job moved to trash. Auto-deleted in 30 days." }
```

### PATCH `/org/jobs/:id/restore` — Restore from Trash

```
Find DeletedJob where jobId = :id AND orgId = req.user.sub
  → NotFoundError("Job not found in trash")
        │
        ▼
Check: deleteAt > now() (within 30-day window)
  → BadRequestError("This job has been permanently deleted and cannot be restored")
        │
        ▼
Find the original Job row via FK (jobId, status = ARCHIVED)
  → NotFoundError if somehow gone (edge case: manual DB intervention)
        │
        ▼
Prisma transaction:
  1. Update Job: status = CLOSED  (not re-published automatically — org must review)
  2. Delete DeletedJob record
        │
        ▼
Return 200 { job, message: "Job restored successfully" }
```

### GET `/org/jobs` — List Own Jobs

```
Query params:
  ?status=DRAFT|PUBLISHED|CLOSED   (ARCHIVED excluded from UI list)
  ?page=1&limit=20
  ?sortBy=createdAt|publishedAt|title
  ?sortOrder=asc|desc
        │
        ▼
Always filter: orgId = req.user.sub, status != ARCHIVED (unless status param given)
        │
        ▼
Include per-job: _count { applications }
        │
        ▼
Return paginated { jobs, meta }
```

---

## Soft Delete Architecture

### New Prisma Model — `DeletedJob`

```prisma
model DeletedJob {
  id        String   @id @default(uuid())
  jobId     String   @unique
  orgId     String
  deletedAt DateTime @default(now())
  deleteAt  DateTime                  // hard delete scheduled after this date

  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([deleteAt])    // efficient cleanup queries
  @@index([orgId])
  @@map("deleted_jobs")
}
```

> **Design decision:** `DeletedJob` holds a FK to `Job` — restore must find the
> original ARCHIVED `Job` row. The `Job` record is kept with `status = ARCHIVED`
> (invisible to all public endpoints) until either restored or hard-deleted by
> the cleanup worker. If the cleanup worker deletes the `Job` row,
> `onDelete: Cascade` automatically removes the `DeletedJob` record too — no
> orphan rows.

### Auto-Cleanup — BullMQ Repeatable Job

```
BullMQ scheduler (daily at 02:00 UTC):
        │
        ▼
Query: SELECT * FROM deleted_jobs WHERE deleteAt < now()
        │
        ▼
For each expired DeletedJob:
  Hard delete the ARCHIVED Job row
  → onDelete: Cascade on DeletedJob automatically removes the DeletedJob record
  → Cascade on Job also removes applications, saved_jobs, hiring_incentives
        │
        ▼
Log: "Cleaned up N expired jobs"
```

- No cron setup — BullMQ manages schedule via Redis
- Single delete operation per expired job (cascade handles everything)
- No orphan `DeletedJob` records possible due to FK + cascade

---

## Slug Generation

```typescript
// src/utils/slug.ts

import * as crypto from 'crypto'; // ESM-compatible import

export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // strip special chars
    .replace(/\s+/g, '-') // spaces → hyphens
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, '') // trim leading/trailing hyphens
    .slice(0, 60); // max 60 chars base (SEO sweet spot)

  const suffix = crypto.randomBytes(3).toString('hex'); // 6 hex chars, ~17B combinations
  return `${base}-${suffix}`;
}
```

**SEO decisions:**

- Slug set ONCE at creation — **never regenerated on title update** (SEO
  stability)
- Max ~67 chars total (well within search engine limits)
- Lowercase, hyphen-separated, no special characters
- Suffix from `crypto` reuses existing dep in `token.ts` — no `nanoid` needed

---

## HTML Sanitization

```typescript
// src/utils/sanitize.ts

import * as DOMPurify from 'isomorphic-dompurify';

// Tags supported by TipTap starter kit
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'a',
];

const ALLOWED_ATTRS = ['href', 'target', 'rel'];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTRS,
  }) as string;
}
```

Applied to: `description`, `requirements`, `responsibilities` — on both create
AND update.

**New deps:**

```bash
npm install isomorphic-dompurify
npm install --save-dev @types/dompurify
```

---

## Validation Schema (Zod)

```typescript
// src/validations/job.validation.ts

export const createJobSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(5).max(150),
      description: z.string().min(50).max(50_000), // TipTap HTML, sanitized server-side (see ALLOWED_TAGS in sanitize.ts)
      requirements: z.string().max(20_000).optional(),
      responsibilities: z.string().max(20_000).optional(),
      jobType: z.enum([
        'FULL_TIME',
        'PART_TIME',
        'CONTRACT',
        'INTERNSHIP',
        'FREELANCE',
        'REMOTE', // Note: 'REMOTE' jobType is for fully-remote contract/freelance roles. Use isRemote boolean for other types.
      ]),
      location: z.string().trim().max(200).optional(),
      isRemote: z.boolean().default(false),
      salaryMin: z.number().positive().optional(),
      salaryMax: z.number().positive().optional(),
      salaryCurrency: z.string().length(3).default('USD'),
      experienceLevel: z.enum(['Entry', 'Mid', 'Senior', 'Lead']).optional(),
      skills: z.array(z.string().trim().max(50)).max(20).default([]),
      category: z.string().trim().max(100).optional(),
      deadline: z.coerce
        .date()
        .min(new Date(), 'Deadline must be in the future')
        .optional(),
      vacancies: z.number().int().min(1).max(999).default(1),

      // TODO [FUTURE - Phase X: requiredPlan Permission Gate]
      // Add middleware/service check: orgs on FREE plan cannot set requiredPlan = BASIC or PREMIUM
      // NOTE: For Phase 3b, any approved org can set any requiredPlan value.
      // Permission gating will be enforced in a future phase.
      requiredPlan: z.enum(['FREE', 'BASIC', 'PREMIUM']).default('FREE'),
    })
    .refine((d) => d.location !== undefined || d.isRemote === true, {
      message: 'Must provide either a location or set isRemote to true',
      path: ['location'],
    })
    .refine(
      (d) => {
        if (d.salaryMin !== undefined && d.salaryMax !== undefined) {
          return d.salaryMax >= d.salaryMin;
        }
        return true;
      },
      { message: 'salaryMax must be >= salaryMin', path: ['salaryMax'] },
    ),
});

// Update: all body fields optional, same cross-field refinements
export const updateJobSchema = z.object({
  body: createJobSchema.shape.body
    .partial()
    .refine(
      (d) => {
        // Only validate if either salaryMin or salaryMax is present
        if (
          d.salaryMin !== undefined &&
          d.salaryMax !== undefined
        ) {
          return d.salaryMax >= d.salaryMin;
        }
        return true;
      },
      { message: 'salaryMax must be >= salaryMin', path: ['salaryMax'] },
    ),
        // Only run if either location or isRemote is present in the update
        if ('location' in d || 'isRemote' in d) {
          return d.location !== undefined || d.isRemote === true;
        }
        return true;
      },
      {
        message: 'Must provide a location or mark as remote',
        path: ['location'],
      },
    )
    .refine(
      (d) => {
        if (
          ('salaryMin' in d && d.salaryMin !== undefined) &&
          ('salaryMax' in d && d.salaryMax !== undefined)
        ) {
          return d.salaryMax >= d.salaryMin;
        }
        return true;
      },
      { message: 'salaryMax must be >= salaryMin', path: ['salaryMax'] },
    ),
  params: z.object({ id: z.string().uuid('Invalid job ID') }),
});

export const listOrgJobsSchema = z.object({
  query: z.object({
    status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['createdAt', 'publishedAt', 'title']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const jobIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid job ID') }),
});
```

---

## Service Layer — Business Rules

| Function                        | Key Rules                                                                  |
| ------------------------------- | -------------------------------------------------------------------------- |
| `createJob(orgId, data)`        | isApproved check, sanitize HTML, generate slug, status=DRAFT               |
| `updateJob(orgId, jobId, data)` | verify ownership, block on ARCHIVED, sanitize HTML, slug unchanged         |
| `publishJob(orgId, jobId)`      | status must be DRAFT/CLOSED, validate required fields                      |
| `closeJob(orgId, jobId)`        | status must be PUBLISHED                                                   |
| `softDeleteJob(orgId, jobId)`   | status must be DRAFT/CLOSED, snapshot→DeletedJob, set ARCHIVED             |
| `restoreJob(orgId, jobId)`      | find DeletedJob, check TTL, restore to CLOSED                              |
| `listOrgJobs(orgId, query)`     | scope to orgId, exclude ARCHIVED by default, include `_count.applications` |
| `getOrgJob(orgId, jobId)`       | verify ownership, include `_count.applications`                            |
| `listDeletedJobs(orgId, query)` | query DeletedJob table scoped to orgId                                     |

---

## Scalability Notes — Future Plan-Based Visibility

> **[FUTURE - Phase 3c+]:** Guest and free user job visibility restrictions

The architecture supports this without refactoring:

| User Type        | Visibility (future)                                                     |
| ---------------- | ----------------------------------------------------------------------- |
| Guest (no token) | Only `FREE` jobs, limited fields (no salary, truncated description)     |
| FREE user        | `FREE` jobs fully; `BASIC`/`PREMIUM` jobs shown as locked/blurred cards |
| BASIC user       | `FREE` + `BASIC` jobs fully                                             |
| PREMIUM user     | All jobs, all fields                                                    |

**How it plugs in cleanly:**

1. `requiredPlan` field already on every `Job` row — filter is a one-line Prisma
   `where` clause
2. `optionalAuthenticate` middleware (already built) handles guest vs auth
   gracefully
3. `requireSubscription` middleware (already in auth design) handles
   apply-gating
4. Public job listing (3c) adds a `buildPlanVisibilityFilter(user)` helper —
   zero 3b changes needed

---

## New Dependencies

| Package                | Purpose                       | Type       |
| ---------------------- | ----------------------------- | ---------- |
| `isomorphic-dompurify` | Server-side HTML sanitization | production |
| `@types/dompurify`     | TypeScript types              | dev        |

No other new deps — `crypto`, `uuid`, `BullMQ`, `Prisma` all already present.

---

## Migration Required

```bash
npx prisma migrate dev --name add_deleted_jobs_table
```

Adds: `deleted_jobs` table with indexes on `deleteAt` and `orgId`.

---

## Implementation Order

1. `prisma/schema.prisma` — add `DeletedJob` model
2. Run migration
3. `src/utils/slug.ts` — slug generator
4. `src/utils/sanitize.ts` — DOMPurify wrapper
5. `src/validations/job.validation.ts` — all Zod schemas
6. `src/services/job.service.ts` — all business logic
7. `src/controllers/job.controller.ts` — thin controllers
8. `src/routes/org.job.routes.ts` — routes + Swagger JSDoc
9. `src/routes/index.ts` — mount new routes
10. `src/jobs/workers/job-cleanup.worker.ts` — BullMQ daily cleanup
11. Integration tests
