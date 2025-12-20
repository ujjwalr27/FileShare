import { Request, Response } from 'express';
import * as shareService from '../services/shareService';
import * as fileService from '../services/fileService';
import { AuthRequest } from '../types';
import config from '../config';
import StorageService from '../services/storageService';

/**
 * Create a new share link for a file
 * POST /api/shares
 */
export const createShare = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { fileId, password, expiresAt, maxDownloads } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // Validate expiresAt if provided
    let expiryDate: Date | undefined;
    if (expiresAt) {
      expiryDate = new Date(expiresAt);
      if (isNaN(expiryDate.getTime())) {
        return res.status(400).json({ error: 'Invalid expiration date' });
      }
      if (expiryDate <= new Date()) {
        return res.status(400).json({ error: 'Expiration date must be in the future' });
      }
    }

    // Validate maxDownloads if provided
    if (maxDownloads !== undefined && (typeof maxDownloads !== 'number' || maxDownloads < 1)) {
      return res.status(400).json({ error: 'Max downloads must be a positive number' });
    }

    const share = await shareService.createShare({
      fileId,
      userId,
      password,
      expiresAt: expiryDate,
      maxDownloads,
    });

    res.status(201).json({ success: true, data: share });
  } catch (error: any) {
    console.error('Create share error:', error);
    res.status(500).json({ error: error.message || 'Failed to create share link' });
  }
};

/**
 * Get all shares for a specific file
 * GET /api/shares/file/:fileId
 */
export const getFileShares = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { fileId } = req.params;

    const shares = await shareService.getFileShares(fileId, userId);
    res.json({ success: true, data: shares });
  } catch (error: any) {
    console.error('Get file shares error:', error);
    res.status(500).json({ error: 'Failed to retrieve shares' });
  }
};

/**
 * Get all shares created by the user
 * GET /api/shares
 */
export const getUserShares = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const shares = await shareService.getUserShares(userId);
    res.json({ success: true, data: shares });
  } catch (error: any) {
    console.error('Get user shares error:', error);
    res.status(500).json({ error: 'Failed to retrieve shares' });
  }
};

/**
 * Get share information by token (public endpoint)
 * GET /api/shares/public/:token
 */
export const getPublicShare = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const result = await shareService.getSharedFile(
      token,
      password as string | undefined
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, data: result.file });
  } catch (error: any) {
    console.error('Get public share error:', error);
    res.status(500).json({ error: 'Failed to retrieve shared file' });
  }
};

/**
 * Download a shared file (public endpoint)
 * GET /api/shares/public/:token/download
 */
export const downloadSharedFile = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const validation = await shareService.validateShare({
      token,
      password: password as string | undefined,
    });

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const share = validation.share!;

    // Get file
    const file = await fileService.getFileById(share.file_id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Increment download count
    await shareService.incrementDownloadCount(share.id);

    // Check if using Supabase Storage
    if (config.upload.useSupabaseStorage) {
      try {
        // Import StorageService dynamically or ensure it's imported at top
        const StorageService = require('../services/storageService').default;

        // Get signed URL from Supabase
        // file.path in DB should store the storage path (e.g., "userId/filename")
        const signedUrl = await StorageService.getSignedUrl(file.path, 60); // 60 seconds validity

        // Redirect to the signed URL
        return res.redirect(signedUrl);
      } catch (storageError: any) {
        console.error('Supabase download error:', storageError);
        return res.status(500).json({ error: 'Failed to retrieve file from storage' });
      }
    }

    // Fallback to local filesystem
    res.download(file.path, file.original_name, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download file' });
        }
      }
    });
  } catch (error: any) {
    console.error('Download shared file error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download file' });
    }
  }
};

/**
 * Update share settings
 * PUT /api/shares/:id
 */
export const updateShare = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { password, expiresAt, maxDownloads, isActive } = req.body;

    const updates: any = {};

    if (password !== undefined) {
      updates.password = password;
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        updates.expiresAt = null;
      } else {
        const expiryDate = new Date(expiresAt);
        if (isNaN(expiryDate.getTime())) {
          return res.status(400).json({ error: 'Invalid expiration date' });
        }
        if (expiryDate <= new Date()) {
          return res.status(400).json({ error: 'Expiration date must be in the future' });
        }
        updates.expiresAt = expiryDate;
      }
    }

    if (maxDownloads !== undefined) {
      if (maxDownloads !== null && (typeof maxDownloads !== 'number' || maxDownloads < 1)) {
        return res.status(400).json({ error: 'Max downloads must be a positive number' });
      }
      updates.maxDownloads = maxDownloads;
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    const share = await shareService.updateShare(id, userId, updates);
    res.json({ success: true, data: share });
  } catch (error: any) {
    console.error('Update share error:', error);
    res.status(500).json({ error: error.message || 'Failed to update share' });
  }
};

/**
 * Delete a share
 * DELETE /api/shares/:id
 */
export const deleteShare = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await shareService.deleteShare(id, userId);
    res.json({ success: true, message: 'Share deleted successfully' });
  } catch (error: any) {
    console.error('Delete share error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete share' });
  }
};

/**
 * Revoke a share (deactivate without deleting)
 * POST /api/shares/:id/revoke
 */
export const revokeShare = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const share = await shareService.revokeShare(id, userId);
    res.json({ success: true, data: share });
  } catch (error: any) {
    console.error('Revoke share error:', error);
    res.status(500).json({ error: error.message || 'Failed to revoke share' });
  }
};
