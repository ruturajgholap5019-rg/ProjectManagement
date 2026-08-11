import { Request, Response, NextFunction, Router } from 'express';
import { DashboardService } from './dashboard.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { AppError } from '../../middlewares/error.middleware.js';

export class DashboardController {
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const data = await DashboardService.getDashboard(req.user);
      sendSuccess(res, data, 'Dashboard data retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

const router = Router();
router.use(authenticate);
router.get('/dashboard', DashboardController.getDashboard);

export default router;
