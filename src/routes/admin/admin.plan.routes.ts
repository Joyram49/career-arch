import * as AdminPlanController from '@controllers/admin/admin.plan.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { validate } from '@middlewares/validate';
import { asyncHandler } from '@utils/asyncHandler';
import {
  createPlanSchema,
  planIdParamSchema,
  updatePlanSchema,
} from '@validations/subscription.validation';
import { Router } from 'express';

const router = Router();

// All admin plan routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

// ── Plan Catalogue CRUD ───────────────────────────────────────────────────

/**
 * @swagger
 * /admin/plans:
 *   get:
 *     summary: List all plans (including inactive)
 *     tags: [Admin Plans]
 */
router.get('/', asyncHandler(AdminPlanController.listPlans));

/**
 * @swagger
 * /admin/plans/{id}:
 *   get:
 *     summary: Get single plan by ID
 *     tags: [Admin Plans]
 */
router.get('/:id', validate(planIdParamSchema), asyncHandler(AdminPlanController.getPlan));

/**
 * @swagger
 * /admin/plans:
 *   post:
 *     summary: Create a new paid plan (syncs to Stripe)
 *     tags: [Admin Plans]
 */
router.post('/', validate(createPlanSchema), asyncHandler(AdminPlanController.createPlan));

/**
 * @swagger
 * /admin/plans/{id}:
 *   put:
 *     summary: Update plan metadata or pricing
 *     tags: [Admin Plans]
 */
router.put('/:id', validate(updatePlanSchema), asyncHandler(AdminPlanController.updatePlan));

/**
 * @swagger
 * /admin/plans/{id}/toggle:
 *   patch:
 *     summary: Toggle plan active/inactive
 *     tags: [Admin Plans]
 */
router.patch(
  '/:id/toggle',
  validate(planIdParamSchema),
  asyncHandler(AdminPlanController.togglePlan),
);

/**
 * @swagger
 * /admin/plans/{id}:
 *   delete:
 *     summary: Soft-delete a plan (guards against active subscribers)
 *     tags: [Admin Plans]
 */
router.delete('/:id', validate(planIdParamSchema), asyncHandler(AdminPlanController.deletePlan));

export default router;
