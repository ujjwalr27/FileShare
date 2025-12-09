import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

/**
 * Error handling middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  console.error('Error:', err);

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'File too large', 413);
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return sendError(res, 'Too many files', 400);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return sendError(res, 'Unexpected file field', 400);
  }

  // Database errors
  if (err.code === '23505') {
    return sendError(res, 'Resource already exists', 409);
  }

  if (err.code === '23503') {
    return sendError(res, 'Referenced resource not found', 404);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', 401);
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return sendError(res, err.message, 400);
  }

  // Default error
  return sendError(
    res,
    err.message || 'Internal server error',
    err.statusCode || 500
  );
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  return sendError(res, `Route ${req.originalUrl} not found`, 404);
};
