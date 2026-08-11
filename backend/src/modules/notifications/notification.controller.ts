import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class NotificationController {
  static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifications = await NotificationService.getUserNotifications(req.user!.id);
      sendSuccess(res, notifications, 'Notifications retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await NotificationService.markAllAsRead(req.user!.id);
      sendSuccess(res, null, 'Notifications marked as read');
    } catch (error) {
      next(error);
    }
  }
}
