import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { UserRole } from '../../types/enums.js';

export class UserController {
  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await UserService.createUser(req.body);
      sendSuccess(res, result, 'User account created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role, active, search, page, limit } = req.query;
      const result = await UserService.listUsers({
        role: role as UserRole | undefined,
        active: active === undefined ? undefined : active === 'true',
        search: search as string | undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      if (result && typeof result === 'object' && 'users' in result) {
        sendSuccess(res, result.users, 'Users retrieved successfully', 200, result.meta);
        return;
      }

      sendSuccess(res, result, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.getUserById(req.params.id);
      sendSuccess(res, user, 'User details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await UserService.updateUser(req.params.id, req.body);
      sendSuccess(res, updated, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async activateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await UserService.setUserActiveStatus(req.params.id, true, req.body?.projectId);
      sendSuccess(res, updated, 'User activated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await UserService.setUserActiveStatus(req.params.id, false);
      sendSuccess(res, updated, 'User deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await UserService.resetPassword(req.params.id, req.body.tempPassword);
      sendSuccess(res, result, 'User password reset successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await UserService.deleteUser(req.params.id);
      sendSuccess(res, result, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
