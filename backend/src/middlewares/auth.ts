import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import config from '../config';
import { sendError } from '../utils/response';
import { JWTPayload, AuthRequest } from '../types';

/**
 * Middleware to verify JWT token
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'No token provided', 401);
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

      // Fetch user from database
      const result = await query(
        'SELECT id, email, name, role, storage_quota, storage_used, is_active, created_at, updated_at FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return sendError(res, 'User not found or inactive', 401);
      }

      req.user = result.rows[0];
      next();
    } catch (error) {
      return sendError(res, 'Invalid or expired token', 401);
    }
  } catch (error) {
    return sendError(res, 'Authentication error', 500);
  }
};

/**
 * Middleware to check if user has specific role
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Forbidden - Insufficient permissions', 403);
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

        const result = await query(
          'SELECT id, email, name, role, storage_quota, storage_used, is_active, created_at, updated_at FROM users WHERE id = $1 AND is_active = true',
          [decoded.userId]
        );

        if (result.rows.length > 0) {
          req.user = result.rows[0];
        }
      } catch (error) {
        // Token invalid, but we don't fail
      }
    }

    next();
  } catch (error) {
    next();
  }
};
