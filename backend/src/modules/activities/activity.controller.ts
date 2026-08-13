import { Request, Response, NextFunction } from 'express';
import { ActivityService } from './activity.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class ActivityController {
  static async logActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activity = await ActivityService.logActivity({
        userId: req.body.userId || req.user!.id,
        projectId: req.body.projectId,
        workDescription: req.body.workDescription,
        hoursSpent: req.body.hoursSpent,
        assignedById: req.user!.role === 'ADMIN' ? req.user!.id : undefined,
        dateTime: req.body.dateTime,
      });
      sendSuccess(res, activity, 'Work activity logged successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async listActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ActivityService.listActivities({
        userId: req.query.userId as string,
        projectId: req.query.projectId as string,
        period: req.query.period as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        search: req.query.search as string,
      });
      sendSuccess(res, result, 'Work activities retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async exportActivitiesCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const csv = await ActivityService.exportToCSV({
        userId: req.query.userId as string,
        projectId: req.query.projectId as string,
        period: req.query.period as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        search: req.query.search as string,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="work_activities_report.csv"');
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }

  static async updateActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await ActivityService.updateActivity(
        req.params.id,
        {
          workDescription: req.body.workDescription,
          hoursSpent: req.body.hoursSpent,
          projectId: req.body.projectId,
          userId: req.body.userId,
          dateTime: req.body.dateTime,
        },
        req.user!
      );
      sendSuccess(res, updated, 'Work activity log updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ActivityService.deleteActivity(req.params.id, req.user!);
      sendSuccess(res, result, 'Work activity log deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
