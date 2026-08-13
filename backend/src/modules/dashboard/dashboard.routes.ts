import { Request, Response, NextFunction, Router } from 'express';
import { DashboardService } from './dashboard.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { cacheGet, cacheSet } from '../../config/redis.js';

export class DashboardController {
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const cacheKey = `dashboard:${req.user.id}:${req.user.role}:${category || 'ALL'}`;
      const cachedData = await cacheGet(cacheKey);
      if (cachedData) {
        sendSuccess(res, cachedData, 'Dashboard data retrieved successfully (cached)');
        return;
      }

      const data = await DashboardService.getDashboard(req.user, { category });
      await cacheSet(cacheKey, data, 10); // Cache for 10s
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
