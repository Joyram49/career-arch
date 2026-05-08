/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { type IAuthenticatedRequest } from '@app-types/auth.types';
import { prisma } from '@config/database';
import { sendError } from '@shared/utils/apiResponse';

import { getPlanFeatures } from '@/modules/admin/services/admin.plans.service';

import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Guards GET /org/profile/:id (public org profile view)
 * Free users cannot view full company profiles.
 * Must run after authenticate middleware.
 */
export const checkOrgProfileAccess: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as IAuthenticatedRequest;

    // Must be logged in

    if (authReq.user === undefined) {
      sendError(res, 'You must be logged in to view company profiles', 401);
      return;
    }

    const { sub } = authReq.user;

    const subscription = await prisma.subscription.findUnique({
      where: { userId: sub },
      select: { plan: true },
    });

    if (subscription === null) {
      sendError(res, 'Subscription not found', 404);
      return;
    }

    const features = await getPlanFeatures(subscription.plan);

    if (!features.canViewOrgProfile) {
      sendError(res, 'Upgrade to Basic or Premium to view full company profiles.', 403, [
        { field: 'orgProfile', message: 'Plan upgrade required' },
      ]);
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
