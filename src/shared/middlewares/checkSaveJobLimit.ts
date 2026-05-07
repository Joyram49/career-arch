import { type IAuthenticatedRequest } from '@app-types/auth.types';
import { prisma } from '@config/database';
import { getPlanFeatures } from '@services/admin/admin.plan.service';
import { sendError } from '@shared/utils/apiResponse';

import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Guards POST /jobs/:id/save
 * Checks the user's saved job count against their plan limit.
 * Must run after authenticate middleware.
 */
export const checkSaveJobLimit: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sub } = (req as IAuthenticatedRequest).user;

    const existSub = await prisma.subscription.findUnique({
      where: { userId: sub },
      select: { plan: true, savedJobCount: true },
    });

    if (existSub === null) {
      sendError(res, 'Subscription not found', 404);
      return;
    }

    const features = await getPlanFeatures(existSub.plan);

    // -1 means unlimited
    if (features.saveJobsLimit !== -1 && existSub.savedJobCount >= features.saveJobsLimit) {
      sendError(
        res,
        `You've reached your saved jobs limit (${existSub.savedJobCount}/${features.saveJobsLimit}). Upgrade your plan to save more jobs.`,
        403,
        [{ field: 'savedJobs', message: 'Save limit reached' }],
      );
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
