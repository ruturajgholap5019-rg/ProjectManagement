import { Request, Response, NextFunction } from 'express';
import { GlobalSearchService } from './search.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class SearchController {
  static async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = (req.query.q as string) || '';
      const results = await GlobalSearchService.search(q);
      sendSuccess(res, results, 'Search results retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
