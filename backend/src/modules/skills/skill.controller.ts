import { Request, Response, NextFunction } from 'express';
import { SkillService } from './skill.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class SkillController {
  static async addSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId || req.user!.id;
      const skill = await SkillService.addSkill(userId, req.body);
      sendSuccess(res, skill, 'Member skill updated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getUserSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId || req.user!.id;
      const skills = await SkillService.getUserSkills(userId);
      sendSuccess(res, skills, 'Member skills retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getUserTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId || req.user!.id;
      const timeline = await SkillService.getUserTimeline(userId);
      sendSuccess(res, timeline, 'Member timeline and history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
