import { Request, Response, NextFunction } from 'express';
import { ProjectService } from './project.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { ProjectStatus } from '../../types/enums.js';

export class ProjectController {
  static async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const project = await ProjectService.createProject({
        ...req.body,
        createdBy: req.user.id,
      });

      sendSuccess(res, project, 'Project created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const { status, search } = req.query;

      const projects = await ProjectService.listProjects(req.user, {
        status: status as ProjectStatus | undefined,
        search: search as string | undefined,
      });

      sendSuccess(res, projects, 'Projects retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await ProjectService.getProjectById(req.params.id);
      sendSuccess(res, project, 'Project details retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await ProjectService.updateProject(req.params.id, req.body);
      sendSuccess(res, updated, 'Project details updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, statusReason } = req.body;
      const updated = await ProjectService.updateProjectStatus(req.params.id, status, statusReason);
      sendSuccess(res, updated, 'Project status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ProjectService.deleteProject(req.params.id);
      sendSuccess(res, result, 'Project deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
