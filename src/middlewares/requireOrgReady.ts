import { prisma } from '@config/database';
import { sendError } from '@utils/apiResponse';

import type { IAuthenticatedRequest } from '@app-types/index';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * requireOrgReady — must be used AFTER authenticate + authorize('ORGANIZATION')
 *
 * Gates any route that requires the org to be fully onboarded:
 *   1. isApproved === true   (admin has reviewed and approved them)
 *   2. isPaymentMethodOnFile === true  (card saved for incentive billing)
 *   3. hasUnpaidIncentives === false   (no overdue payments blocking them)
 *
 * Usage:
 *   router.post('/jobs', authenticate, authorize('ORGANIZATION'), requireOrgReady, handler)
 */
export const requireOrgReady: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sub } = (req as IAuthenticatedRequest).user;

    const org = await prisma.organization.findUnique({
      where: { id: sub },
      select: {
        isApproved: true,
        isPaymentMethodOnFile: true,
        hasUnpaidIncentives: true,
      },
    });

    if (org === null) {
      sendError(res, 'Organization not found', 404);
      return;
    }

    if (!org.isApproved) {
      sendError(
        res,
        'Your organization account is pending approval. You will be notified once approved.',
        403,
      );
      return;
    }

    if (!org.isPaymentMethodOnFile) {
      sendError(
        res,
        'A payment method is required before posting jobs. Please add your card details at /org/billing.',
        403,
      );
      return;
    }

    if (org.hasUnpaidIncentives) {
      sendError(
        res,
        'Your account has outstanding incentive payments. Please settle them at /org/incentives before posting new jobs.',
        403,
      );
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
