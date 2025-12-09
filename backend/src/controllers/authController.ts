import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, asyncHandler } from '../utils/response';
import * as authService from '../services/authService';

/**
 * Register a new user
 */
export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Validation
  await body('email').isEmail().normalizeEmail().run(req);
  await body('password').isLength({ min: 6 }).run(req);
  await body('name').notEmpty().trim().run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array());
  }

  const { email, password, name } = req.body;

  try {
    const { user, token } = await authService.registerUser(email, password, name);

    return sendSuccess(
      res,
      { user, token },
      'User registered successfully',
      201
    );
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Login user
 */
export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Validation
  await body('email').isEmail().normalizeEmail().run(req);
  await body('password').notEmpty().run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array());
  }

  const { email, password } = req.body;

  try {
    const { user, token } = await authService.loginUser(email, password);

    return sendSuccess(res, { user, token }, 'Login successful');
  } catch (error: any) {
    return sendError(res, error.message, 401);
  }
});

/**
 * Get current user profile
 */
export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'User not authenticated', 401);
  }

  return sendSuccess(res, req.user);
});

/**
 * Update user profile
 */
export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Validation
  await body('name').optional().notEmpty().trim().run(req);
  await body('email').optional().isEmail().normalizeEmail().run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array());
  }

  const { name, email } = req.body;

  try {
    const updatedUser = await authService.updateUserProfile(req.user.id, {
      name,
      email,
    });

    return sendSuccess(res, updatedUser, 'Profile updated successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Change password
 */
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Validation
  await body('oldPassword').notEmpty().run(req);
  await body('newPassword').isLength({ min: 6 }).run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array());
  }

  const { oldPassword, newPassword } = req.body;

  try {
    await authService.changePassword(req.user.id, oldPassword, newPassword);

    return sendSuccess(res, null, 'Password changed successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});
