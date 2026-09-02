import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/enums.js';
import { Project, ProjectMember } from '../models/index.js';
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

    const project = await Project.findById(projectId).lean();

    if (!project) {
      return next(new AppError('Project not found.', 404));
    }

    const isLead = (project as any).leadId === req.user.id;
    const membership = await ProjectMember.findOne({ projectId, userId: req.user.id }).lean();
    const isMember = !!membership;

    if (!isLead && !isMember) {
      return next(new AppError('Forbidden: You are not a member of this project.', 403));
    }

    req.isProjectLead = isLead;
    return next();
  };
}
