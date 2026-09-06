import { Request, Response, NextFunction, Router } from 'express';
import { DashboardService } from './dashboard.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { AppError } from '../../middlewares/error.middleware.js';

export class DashboardController {
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);

      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const period = typeof req.query.period === 'string' ? req.query.period : undefined;
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

      // Single caching layer — DashboardService owns all caching (600s TTL)
      const data = await DashboardService.getDashboard(req.user, { category, period, startDate, endDate });
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
