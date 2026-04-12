import { sendError } from '@utils/apiResponse';

import type { Role } from '@prisma/client';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Restricts route access to specific roles.
 * Must be used AFTER authenticate middleware.
 *
 * @example
 * router.get('/admin-only', authenticate, authorize('ADMIN'), handler)
 * router.get('/org-or-admin', authenticate, authorize('ORGANIZATION', 'ADMIN'), handler)
 */
export function authorize(...roles: Role[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = getRequestUserRole(req);
    if (userRole === null) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    if (!roles.includes(userRole)) {
      sendError(res, `Access denied. Required role: ${roles.join(' or ')}`, 403);
      return;
    }

    next();
  };
}

function getRequestUserRole(req: Request): Role | null {
  if (!('user' in req)) return null;
  const maybeUser = (req as { user?: unknown }).user;
  if (typeof maybeUser !== 'object' || maybeUser === null || !('role' in maybeUser)) {
    return null;
  }

  const role = (maybeUser as { role?: unknown }).role;
  return typeof role === 'string' ? (role as Role) : null;
}
