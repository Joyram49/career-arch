# ⚡ CareerArch — Session Instructions

> Paste this at the top of every session along with CAREERARCH_OVERVIEW.md and
> only the files relevant to your specific task.

---

## Project Identity

**CareerArch** — Production-grade job portal backend **Stack:** Node.js v20 ·
Express 5 · TypeScript (strict) · PostgreSQL 16 · Prisma 7 · Redis · BullMQ ·
Stripe · Socket.IO · Zod 4 · Cloudinary · Nodemailer (Brevo) **Repo:**
<https://github.com/Joyram49/career-arch> **Status:** Phase 3 complete. Tests +
OAuth + Frontend pending.

---

## 1. The Golden Architecture Rule

```
Route → Middleware → asyncHandler(Controller) → Service → Response
```

- **Controllers are thin** — extract from `req`, call one service function, call
  one response helper. No logic.
- **Services are fat** — all business logic, DB queries, Redis ops, email
  enqueue, Socket emits live here.
- **Never** `res.status().json()` from a service. Always throw a named error.
- **Never** `await sendEmail()` inline. Always `enqueueEmail(payload)`.

---

## 2. File Naming & Path Aliases

Always use path aliases. Never use relative imports.

```typescript
// ✅ Correct
import { prisma } from '@config/database';
import { sendSuccess } from '@utils/apiResponse';
import { BadRequestError } from '@utils/apiError';

// ❌ Never
import { prisma } from '../../config/database';
```

**Available aliases:** `@config/*` · `@controllers/*` · `@middlewares/*` ·
`@routes/*` · `@services/*` `@utils/*` · `@validations/*` · `@jobs/*` ·
`@app-types/*` · `@/*` (= src/\*)

---

## 3. Error Handling

Always throw typed errors from services. The global `errorHandler` catches
everything.

```typescript
throw new BadRequestError('Invalid or expired token');
throw new UnauthorizedError('Invalid email or password');
throw new ForbiddenError('Please verify your email before logging in.');
throw new NotFoundError('User not found');
throw new ConflictError('An account with this email already exists');
throw new TooManyRequestsError('Too many requests. Try again later.');
throw new InternalError('Something went wrong');
```

All live in `src/utils/apiError.ts`.

---

## 4. Response Helpers

```typescript
// src/utils/apiResponse.ts
return sendSuccess(res, { user }, 'Profile retrieved'); // 200
return sendSuccess(res, { jobs }, 'Jobs retrieved', 200, meta); // 200 + pagination
return sendCreated(res, { job }, 'Job created successfully'); // 201
return sendNoContent(res); // 204
return sendError(res, 'Validation failed', 400, errors); // any error
```

---

## 5. Standard Response Format

```json
// Success
{ "success": true, "message": "...", "data": {}, "meta": {} }

// Error
{ "success": false, "message": "...", "errors": [{ "field": "email", "message": "..." }] }

// Pagination meta shape
{ "page": 1, "limit": 20, "total": 145, "totalPages": 8, "hasNextPage": true, "hasPrevPage": false }
```

---

## 6. Zod Validation Pattern

Every route must have a Zod schema. Schema wraps `body`, `query`, `params`.

```typescript
// In validations/something.validation.ts
export const createThingSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    type: z.enum(['A', 'B', 'C']),
  }),
});

export const listThingsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

// Inferred types always at the bottom
export type CreateThingInput = z.infer<typeof createThingSchema>['body'];
export type ListThingsQuery = z.infer<typeof listThingsSchema>['query'];
```

Applied on routes via: `validate(createThingSchema)`

---

## 7. Controller Pattern

```typescript
// Thin — extract, call service, respond. Nothing else.
export async function createThing(
  req: Request,
  res: Response,
): Promise<Response> {
  const { sub } = (req as IAuthenticatedRequest).user;
  const body = req.body as CreateThingInput;
  const thing = await ThingService.createThing(sub, body);
  return sendCreated(res, { thing }, 'Thing created successfully');
}
```

---

## 8. Service Pattern

```typescript
// Fat — all logic lives here
export async function createThing(userId: string, data: CreateThingInput): Promise<IThing> {
  // 1. Guard / validation
  const existing = await prisma.thing.findUnique({ where: { name: data.name } });
  if (existing !== null) throw new ConflictError('Thing already exists');

  // 2. DB operation
  const thing = await prisma.thing.create({ data: { ...data, userId } });

  // 3. Side effects (fire-and-forget)
  enqueueEmail({ name: 'thing:created', to: userEmail, ... });
  emitSomeEvent(userId, { thingId: thing.id });

  // 4. Return
  return thing;
}
```

---

## 9. Route Pattern

```typescript
import { Router } from 'express';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { validate } from '@middlewares/validate';
import { asyncHandler } from '@utils/asyncHandler';
import * as ThingController from '@controllers/thing/thing.controller';
import {
  createThingSchema,
  listThingsSchema,
} from '@validations/thing.validation';

const router = Router();

// Public
router.get(
  '/',
  validate(listThingsSchema),
  asyncHandler(ThingController.listThings),
);

// Protected
router.use(authenticate, authorize('USER'));
router.post(
  '/',
  validate(createThingSchema),
  asyncHandler(ThingController.createThing),
);

export default router;
```

Mount in `src/routes/index.ts`:

```typescript
router.use('/things', thingRoutes);
```

---

## 10. Pagination Pattern

```typescript
// In services — use extractPagination for query objects
import { extractPagination } from '@utils/queryBuilder';
import { buildPaginationMeta } from '@utils/pagination';

const { page, limit, skip } = extractPagination(query);

const [items, total] = await Promise.all([
  prisma.thing.findMany({ where, skip, take: limit, orderBy }),
  prisma.thing.count({ where }),
]);

return { data: items, meta: buildPaginationMeta(total, page, limit) };
```

---

## 11. Email Enqueue Pattern

Never send email inline. Always enqueue.

```typescript
import { enqueueEmail } from '@jobs/queues/email.queue';

// Fire-and-forget — never throws, never blocks
enqueueEmail({
  name: 'user:verify-email', // Must match EmailJobName union type
  to: user.email,
  firstName: 'John',
  verifyUrl: 'https://...',
});
```

Adding a new email type requires:

1. Add to `EmailJobName` union in `email.queue.ts`
2. Add payload interface extending the union
3. Add `case` in `email.worker.ts` switch
4. Add sender function in `email.service.ts`
5. Create HTML template in `src/templates/emails/`

---

## 12. Socket.IO Emit Pattern

```typescript
import {
  emitStatusUpdated,
  emitNewApplication,
  emitIncentiveCreated,
} from '@config/socket';

// Inside a service — after DB update
emitStatusUpdated(application.userId, {
  applicationId,
  jobId,
  jobTitle: 'Senior Dev',
  oldStatus: 'PENDING',
  newStatus: 'SHORTLISTED',
  updatedAt: new Date(),
});
```

Available emit helpers in `src/config/socket.ts`: `emitNewApplication` ·
`emitStatusUpdated` · `emitWithdrawn` `emitIncentiveCreated` ·
`emitNotification`

---

## 13. Authentication in Services/Controllers

```typescript
import type { IAuthenticatedRequest } from '@app-types/index';

// In controller — get logged-in user
const { sub, role, email, plan } = (req as IAuthenticatedRequest).user;

// JWT payload shape (IJwtPayload):
// { sub: string, role: 'USER'|'ORGANIZATION'|'ADMIN', email: string, plan?: string, jti: string }
```

For optional auth routes (public endpoints where login is optional):

```typescript
const user = (req as Partial<IAuthenticatedRequest>).user ?? null;
```

---

## 14. Redis Key Patterns

```typescript
import { redis, RedisKeys, RedisExpiry } from '@config/redis';

// Blacklist a JWT on logout
await redis.setex(RedisKeys.blacklistToken(jti), ttl, '1');

// Store 2FA temp flag
await redis.setex(
  RedisKeys.twoFaTempToken(userId),
  RedisExpiry.TWO_FA_TEMP,
  '1',
);

// Available keys:
RedisKeys.blacklistToken(jti); // blacklist:token:{jti}
RedisKeys.twoFaTempToken(userId); // 2fa:temp:{userId}
RedisKeys.loginAttempts(id); // rate:login:{id}
```

---

## 15. Prisma Transaction Pattern

Use `prisma.$transaction` when multiple writes must be atomic.

```typescript
const [thing, _other] = await prisma.$transaction([
  prisma.thing.create({ data: { ... } }),
  prisma.otherTable.update({ where: { ... }, data: { ... } }),
]);
```

For interactive transactions (when you need results mid-transaction):

```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { ... } });
  await tx.subscription.create({ data: { userId: user.id, plan: 'FREE' } });
});
```

---

## 16. Feature Guard Middleware (apply in this order on routes)

```typescript
router.post(
  '/applications',
  authenticate, // 1. Verify JWT
  authorize('USER'), // 2. Check role
  validate(createApplicationSchema), // 3. Validate body
  checkApplyLimit, // 4. Monthly apply count vs plan limit
  checkJobPlan, // 5. User plan >= job.requiredPlan
  asyncHandler(UserApplicationController.applyToJob),
);

router.post(
  '/jobs',
  authenticate,
  authorize('ORGANIZATION'),
  validate(createJobSchema),
  requireOrgReady, // approved + card on file + no overdue incentives
  asyncHandler(JobController.createJob),
);
```

---

## 17. HTML Sanitization (Job Descriptions)

Always sanitize TipTap HTML before saving.

```typescript
import { sanitizeHtml, sanitizeOptionalHtml } from '@utils/sanitize';

description: sanitizeHtml(data.description),         // required field
requirements: sanitizeOptionalHtml(data.requirements), // optional field → returns null if undefined
```

---

## 18. File Upload (Cloudinary)

```typescript
import {
  uploadAvatarToCloudinary,
  uploadResumeToCloudinary,
  deleteFromCloudinary,
} from '@services/upload/upload.service';

// In service
const newUrl = await uploadAvatarToCloudinary(userId, req.file);
await prisma.userProfile.update({
  where: { userId },
  data: { avatarUrl: newUrl },
});

// Delete old file — fire-and-forget, never fail the request
if (oldUrl !== null) void deleteFromCloudinary(oldUrl);
```

Routes use Multer middleware before the controller:

```typescript
router.post(
  '/avatar',
  uploadAvatarMiddleware.single('avatar'),
  asyncHandler(controller),
);
router.post(
  '/resume',
  uploadResumeMiddleware.single('resume'),
  asyncHandler(controller),
);
```

---

## 19. Slug Generation (Jobs)

```typescript
import { generateSlug } from '@utils/slug';

// Set ONCE at job creation. Never update on title change (SEO stability).
const slug = generateSlug(data.title);
// "Senior React Developer (Remote)" → "senior-react-developer-remote-a1b2c3"
```

---

## 20. Constants Reference

```typescript
import {
  COOKIE_NAMES,
  TOKEN_EXPIRY,
  PLAN_HIERARCHY,
  RATE_LIMIT,
  HTTP_STATUS,
  FILE_UPLOAD,
  INCENTIVE,
  PAGINATION,
} from '@utils/constants';

PLAN_HIERARCHY = { FREE: 0, BASIC: 1, PREMIUM: 2 };
INCENTIVE.AMOUNT_CENTS = 5000; // $50.00
INCENTIVE.PAYMENT_WINDOW_DAYS = 7;
PAGINATION.DEFAULT_PAGE = 1;
PAGINATION.DEFAULT_LIMIT = 20;
PAGINATION.MAX_LIMIT = 100;
```

---

## 21. TypeScript Strict Rules

- **No `any`** — ESLint throws error
- **Explicit return types** on all functions
- **`import type`** for type-only imports
- **No non-null assertions** (`!`) — use null checks
- **`exactOptionalPropertyTypes`** enabled — don't pass `undefined` where field
  is optional
- Never use `as any` — find the real type

---

## 22. Adding a New Feature — Checklist

```
□ 1. Add/update Prisma schema → run migration
□ 2. Write Zod schema in validations/*.validation.ts
□ 3. Write service in services/**/*.service.ts
□ 4. Write controller in controllers/**/*.controller.ts
□ 5. Write route in routes/**/*.routes.ts
□ 6. Mount route in routes/index.ts
□ 7. Add email template if needed (queue + worker + service + HTML)
□ 8. Add Socket emit if real-time update needed
□ 9. Add Swagger JSDoc on routes (optional but preferred)
□ 10. Write integration test in tests/integration/
```

---

## 23. Things That Are Different From Typical Express Apps

| Thing              | How CareerArch Does It                                          |
| ------------------ | --------------------------------------------------------------- |
| File uploads       | Cloudinary (not S3) via Multer memoryStorage → base64           |
| Email              | BullMQ queue → worker → Nodemailer (never inline)               |
| Real-time          | Socket.IO with JWT auth on handshake, room-based                |
| Logout             | JTI blacklisted in Redis (not session destroy)                  |
| Soft delete (jobs) | ARCHIVED status + DeletedJob table with TTL                     |
| Plan features      | Stored as JSON in PlanCatalogue DB table (not hardcoded)        |
| Stripe price IDs   | Stored in DB (admin creates via dashboard, not .env)            |
| Incentive flag     | `hasUnpaidIncentives` denormalized on Organization              |
| Apply counter      | `applyCountThisMonth` on Subscription, reset by cron            |
| Save counter       | `savedJobCount` on Subscription, incremented/decremented inline |

---

## How to Use This File

**Session start template:**

```
[This file — CAREERARCH_INSTRUCTIONS.md]
[CAREERARCH_OVERVIEW.md]
[1–3 relevant source files only]

Task: [One specific thing to build or fix]
```

**Do not paste** the entire src/ folder. Share only files that are directly
related to what you are building or fixing today.
