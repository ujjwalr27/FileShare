import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, asyncHandler } from '../utils/response';
import * as folderService from '../services/folderService';

/**
 * Create folder
 */
export const createFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  // Validation
  await body('name')
    .notEmpty()
    .trim()
    .isLength({ max: 255 })
    .matches(/^[^\/\\:*?"<>|]+$/)
    .withMessage('Folder name contains invalid characters')
    .run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array());
  }

  const { name, parentId } = req.body;

  try {
    const folder = await folderService.createFolder(req.user.id, name, parentId);

    return sendSuccess(res, folder, 'Folder created successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Get user folders
 */
export const getFolders = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { parentId, page = '1', limit = '50' } = req.query;

  const folders = await folderService.getUserFolders(
    req.user.id,
    parentId as string,
    parseInt(page as string, 10),
    parseInt(limit as string, 10)
  );

  return sendSuccess(res, folders);
});

/**
 * Get folder contents (folders and files)
 */
export const getFolderContents = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { id } = req.params;

  // Verify folder belongs to user if id provided
  if (id && id !== 'root') {
    const folder = await folderService.getFolderById(id, req.user.id);
    if (!folder) {
      return sendError(res, 'Folder not found', 404);
    }
  }

  const contents = await folderService.getFolderContents(
    req.user.id,
    id === 'root' ? undefined : id
  );

  return sendSuccess(res, contents);
});

/**
 * Get folder by ID
 */
export const getFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { id } = req.params;

  const folder = await folderService.getFolderById(id, req.user.id);

  if (!folder) {
    return sendError(res, 'Folder not found', 404);
  }

  return sendSuccess(res, folder);
});

/**
 * Get folder breadcrumb
 */
export const getFolderBreadcrumb = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { id } = req.params;

  const breadcrumb = await folderService.getFolderBreadcrumb(id, req.user.id);

  return sendSuccess(res, breadcrumb);
});

/**
 * Rename folder
 */
export const renameFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  // Validation
  await body('name')
    .notEmpty()
    .trim()
    .isLength({ max: 255 })
    .matches(/^[^\/\\:*?"<>|]+$/)
    .withMessage('Folder name contains invalid characters')
    .run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array());
  }

  const { id } = req.params;
  const { name } = req.body;

  try {
    const folder = await folderService.renameFolder(id, req.user.id, name);

    return sendSuccess(res, folder, 'Folder renamed successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Move folder
 */
export const moveFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { id } = req.params;
  const { parentId } = req.body;

  try {
    const folder = await folderService.moveFolder(id, req.user.id, parentId);

    return sendSuccess(res, folder, 'Folder moved successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Delete folder
 */
export const deleteFolder = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { id } = req.params;

  try {
    await folderService.deleteFolder(id, req.user.id);

    return sendSuccess(res, null, 'Folder deleted successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});
