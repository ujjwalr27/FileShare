import { Response } from 'express';
import { ApiResponse } from '../types';

/**
 * Send success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  error: string,
  statusCode: number = 500,
  data?: any
): Response => {
  const response: ApiResponse = {
    success: false,
    error,
    data,
  };

  return res.status(statusCode).json(response);
};

/**
 * Handle async route errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: any, res: Response, next: Function) => {
    Promise.resolve(fn(req, res, next)).catch((err: any) => next(err));
  };
};
