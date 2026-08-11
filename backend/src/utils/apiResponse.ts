import { Response } from 'express';

export interface ApiResponseEnvelope<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operation successful',
  statusCode = 200,
  meta?: ApiResponseEnvelope['meta']
): Response {
  const response: ApiResponseEnvelope<T> = {
    success: true,
    message,
    data,
    ...(meta && { meta }),
  };
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message = 'An error occurred',
  statusCode = 500,
  errorDetails?: any
): Response {
  const response: ApiResponseEnvelope = {
    success: false,
    message,
    ...(errorDetails && { error: errorDetails }),
  };
  return res.status(statusCode).json(response);
}
