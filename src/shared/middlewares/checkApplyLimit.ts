import { type IAuthenticatedRequest } from '@app-types/auth.types';
import { prisma } from '@config/database';
import { getPlanFeatures } from '@services/admin/admin.plan.service';
import { sendError } from '@shared/utils/apiResponse';
import { startOfMonth } from 'date-fns';

import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Guards POST /applications
 * Checks the user's monthly application count against their plan limit.
 * Auto-resets counter if a new calendar month has started.
 * Must run after authenticate middleware.
 */
export const checkApplyLimit: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sub } = (req as IAuthenticatedRequest).user;

    const subscription = await prisma.subscription.findUnique({
      where: { userId: sub },
      select: {
        id: true,
        plan: true,
        applyCountThisMonth: true,
        applyCountResetAt: true,
      },
    });

    if (subscription === null) {
      sendError(res, 'Subscription not found', 404);
      return;
    }

    // ── Auto-reset counter if new calendar month has started ──────────────
    const monthStart = startOfMonth(new Date());
    if (subscription.applyCountResetAt < monthStart) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          applyCountThisMonth: 0,
          applyCountResetAt: monthStart,
        },
      });
      subscription.applyCountThisMonth = 0;
    }

    const features = await getPlanFeatures(subscription.plan);

    // -1 means unlimited
    if (
      features.applyMonthlyLimit !== -1 &&
      subscription.applyCountThisMonth >= features.applyMonthlyLimit
    ) {
      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1, 1);
      resetDate.setHours(0, 0, 0, 0);
      const resetStr = resetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

      sendError(
        res,
        `You've reached your monthly application limit (${subscription.applyCountThisMonth}/${features.applyMonthlyLimit}). Resets on ${resetStr}. Upgrade your plan for more applications.`,
        403,
        [{ field: 'applications', message: 'Monthly apply limit reached' }],
      );
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
