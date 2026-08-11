import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/enums.js';
import { AppError } from './error.middleware.js';

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
          403
        )
      );
    }

    return next();
  };
}
