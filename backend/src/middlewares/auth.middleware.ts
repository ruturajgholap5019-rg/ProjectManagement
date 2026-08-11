import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types/enums.js';
import { env } from '../config/env.js';
import { AppError } from './error.middleware.js';

export interface AuthPayload {
  id: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Missing Bearer token.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    req.user = payload;
    return next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Access token has expired. Please refresh token.', 401));
    }
    return next(new AppError('Invalid access token.', 401));
  }
}
