import { Request, Response, NextFunction } from 'express';
import { MilestoneService } from './milestone.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class MilestoneController {
  static async createMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id || req.body.projectId;
      const milestone = await MilestoneService.createMilestone(projectId, req.body);
      sendSuccess(res, milestone, 'Milestone created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async listMilestones(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id;
      const milestones = await MilestoneService.listMilestones(projectId);
      sendSuccess(res, milestones, 'Milestones retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await MilestoneService.updateMilestone(req.params.id, req.body);
      sendSuccess(res, updated, 'Milestone updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await MilestoneService.deleteMilestone(req.params.id);
      sendSuccess(res, result, 'Milestone deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
