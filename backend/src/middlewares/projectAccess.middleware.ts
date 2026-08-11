import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/enums.js';
import { prisma } from '../config/database.js';
import { AppError } from './error.middleware.js';

declare global {
  namespace Express {
    interface Request {
      isProjectLead?: boolean;
    }
  }
}

export function requireProjectAccess(paramName = 'id') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    const projectId = req.params[paramName] || req.body.projectId;

    if (!projectId) {
      return next(new AppError('Project ID is required to check authorization.', 400));
    }

    // Admin has access to all projects
    if (req.user.role === UserRole.ADMIN) {
      req.isProjectLead = true;
      return next();
    }

    // Query project and membership in a single call
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        leadId: true,
        members: {
          where: { userId: req.user.id },
          select: { id: true },
        },
      },
    });

    if (!project) {
      return next(new AppError('Project not found.', 404));
    }

    const isLead = project.leadId === req.user.id;
    const isMember = project.members.length > 0;

    if (!isLead && !isMember) {
      return next(new AppError('Forbidden: You are not a member of this project.', 403));
    }

    req.isProjectLead = isLead;
    return next();
  };
}
