import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { randomUUID } from 'crypto';

export class AppError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  const requestId = randomUUID().slice(0, 8);

  logger.error(err.message || 'Unhandled error occurred', {
    requestId,
    stack: err.stack,
    details: err.details,
    statusCode: err.statusCode,
  });

  // Intentional application errors — always show the message to the client
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.details);
  }

  // Handle MongoDB Duplicate Key Errors (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return sendError(res, `A record with this ${field} already exists.`, 400, { field });
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e: any) => e.message);
    return sendError(res, messages.join(', ') || 'Validation error', 400);
  }

  // Unhandled errors: in production, hide internal details from clients
  if (env.NODE_ENV === 'production') {
    return sendError(res, 'An unexpected error occurred. Please try again later.', 500, { requestId });
  }

  // In development, expose the error for easier debugging
  return sendError(res, err.message || 'Internal server error', err.statusCode || 500, {
    details: err.details,
    code: err.code,
    requestId,
  });
}
