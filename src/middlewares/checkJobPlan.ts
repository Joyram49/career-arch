import { prisma } from '@config/database';
import { sendError } from '@utils/apiResponse';
import { PLAN_HIERARCHY } from '@utils/constants';

import type { IAuthenticatedRequest } from '@app-types/index';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Guards POST /applications
 * Checks the job's requiredPlan against the user's current subscription plan.
 * Must run AFTER authenticate + checkApplyLimit middleware.
 *
 * Also validates the job exists and is PUBLISHED — catching this early
 * saves a duplicate DB lookup inside the service.
 */
export const checkJobPlan: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sub } = (req as IAuthenticatedRequest).user;
    const { jobId } = req.body as { jobId?: string };

    if (jobId === undefined || jobId.length === 0) {
      sendError(res, 'jobId is required', 400);
      return;
    }

    // Fetch job + user subscription in parallel
    const [job, subscription] = await Promise.all([
      prisma.job.findUnique({
        where: { id: jobId },
        select: { id: true, status: true, requiredPlan: true, deadline: true },
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

    if (job.deadline !== null && job.deadline < new Date()) {
      sendError(res, 'The application deadline for this job has passed', 400);
      return;
    }

    const userLevel = PLAN_HIERARCHY[subscription?.plan ?? 'FREE'];
    const requiredLevel = PLAN_HIERARCHY[job.requiredPlan];

    if (userLevel < requiredLevel) {
      sendError(
        res,
        `This job requires a ${job.requiredPlan} plan or above. Upgrade to apply.`,
        403,
        [{ field: 'plan', message: 'Plan upgrade required to apply to this job' }],
      );
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
