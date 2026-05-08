import * as PublicJobController from '@modules/jobs/controllers/public.job.controller';
import { optionalAuthenticate } from '@shared/middlewares/authenticate';
import { validate } from '@shared/middlewares/validate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { Router } from 'express';

import { jobSlugParamSchema, publicJobSearchSchema } from '../validations/public.jobs.validation';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Public Jobs
 *   description: Publicly accessible job endpoints (auth optional for enhanced data)
 */

/**
 * @swagger
 * /jobs/categories:
 *   get:
 *     summary: Get all distinct job categories
 *     tags: [Public Jobs]
 *     responses:
 *       200:
 *         description: List of category strings
 */
// IMPORTANT: /jobs/categories MUST be declared before /jobs/:slug
// or Express will treat "categories" as a slug value.
router.get('/categories', asyncHandler(PublicJobController.getCategories));

/**
 * @swagger
 * /jobs:
 *   get:
 *     summary: Search published jobs (plan-gated for FREE users)
 *     tags: [Public Jobs]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Keyword — searches title, category, skills, description
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE, REMOTE] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: experienceLevel
 *         schema: { type: string, enum: [Entry, Junior, Mid, Senior, Lead] }
 *       - in: query
 *         name: salaryMin
 *         schema: { type: number }
 *       - in: query
 *         name: salaryMax
 *         schema: { type: number }
 *       - in: query
 *         name: isRemote
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 50 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [publishedAt, createdAt, salaryMax], default: publishedAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated jobs. FREE/guest users see only FREE-tier jobs (capped at 20).
 */
router.get(
  '/',
  optionalAuthenticate,
  validate(publicJobSearchSchema),
  asyncHandler(PublicJobController.searchJobs),
);

/**
 * @swagger
 * /jobs/{slug}:
 *   get:
 *     summary: Get job detail by slug (increments view counter)
 *     tags: [Public Jobs]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Full job detail. Authenticated users get isApplied + isSaved flags.
 *       404:
 *         description: Job not found or not published
 */
router.get(
  '/:slug',
  optionalAuthenticate,
  validate(jobSlugParamSchema),
  asyncHandler(PublicJobController.getJobBySlug),
);

export default router;
