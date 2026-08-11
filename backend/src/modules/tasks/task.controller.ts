import { Request, Response, NextFunction } from 'express';
import { TaskService } from './task.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { TaskStatus } from '../../types/enums.js';

export class TaskController {
  static async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const projectId = req.params.id || req.body.projectId;
      const task = await TaskService.createTask({
        ...req.body,
        projectId,
        createdById: req.user.id,
      });

      sendSuccess(res, task, 'Task created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id;
      const { assigneeId, status, milestoneId, search } = req.query;

      const tasks = await TaskService.listTasks({
        projectId,
        assigneeId: assigneeId as string | undefined,
        status: status as TaskStatus | undefined,
        milestoneId: milestoneId as string | undefined,
        search: search as string | undefined,
      });

      sendSuccess(res, tasks, 'Tasks retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMyTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const tasks = await TaskService.getMyTasks(req.user);
      sendSuccess(res, tasks, 'Assigned tasks retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await TaskService.getTaskById(req.params.id);
      sendSuccess(res, task, 'Task details retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const updated = await TaskService.updateTask(req.params.id, req.body, req.user);
      sendSuccess(res, updated, 'Task updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const { status, completionNotes } = req.body;
      const updated = await TaskService.updateTaskStatus(req.params.id, status, req.user, completionNotes);
      sendSuccess(res, updated, 'Task status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addDependency(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { dependsOnId } = req.body;
      const dep = await TaskService.addDependency(req.params.id, dependsOnId);
      sendSuccess(res, dep, 'Dependency added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async removeDependency(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await TaskService.removeDependency(req.params.id, req.params.depId);
      sendSuccess(res, result, 'Dependency removed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async toggleBlocker(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isBlocked, blockedReason } = req.body;
      const updated = await TaskService.toggleManualBlocker(req.params.id, isBlocked, blockedReason);
      sendSuccess(res, updated, 'Task blocker status updated');
    } catch (error) {
      next(error);
    }
  }
}
