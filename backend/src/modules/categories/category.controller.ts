import { Request, Response, NextFunction } from 'express';
import { CategoryService } from './category.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class CategoryController {
  static async listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await CategoryService.listCategories();
      sendSuccess(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await CategoryService.createCategory(req.body);
      sendSuccess(res, category, 'Category created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await CategoryService.updateCategory(req.params.id, req.body);
      sendSuccess(res, updated, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CategoryService.deleteCategory(req.params.id);
      sendSuccess(res, result, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
