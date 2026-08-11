import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from './error.middleware.js';

export function validateRequest(schema: AnyZodObject) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issueMap = error.issues.map((issue) => ({
          field: issue.path.join('.').replace(/^(body|query|params)\./, ''),
          message: issue.message,
        }));
        return next(new AppError('Validation failed', 400, issueMap));
      }
      return next(error);
    }
  };
}
