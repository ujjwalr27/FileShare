import fs from 'fs';
import path from 'path';
import { query, getClient } from '../config/database';
import config from '../config';
import { File, PaginatedResponse } from '../types';
import { generateFileHash, getFileExtension } from '../utils/helpers';
import StorageService from './storageService';

/**
 * Upload a file
 */
export const uploadFile = async (
  userId: string,
  file: Express.Multer.File,
  folderId?: string
): Promise<File> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Generate file hash
    const fileHash = await generateFileHash(file.path);

    // Check storage quota
    const userResult = await client.query(
      'SELECT storage_used, storage_quota FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    if (user.storage_used + file.size > user.storage_quota) {
      // Delete uploaded file
      fs.unlinkSync(file.path);
      throw new Error('Storage quota exceeded');
    }

    let filePath = file.path;
    let fileName = file.filename;

    // Upload to Supabase Storage if enabled
    if (config.upload.useSupabaseStorage) {
      const storageResult = await StorageService.uploadFile(file, userId);
      filePath = storageResult.path;
      // file.path is already cleaned up by StorageService
    } else {
      fileName = file.filename;
    }

    // Insert file record
    const fileResult = await client.query(
      `INSERT INTO files (user_id, folder_id, name, original_name, path, size, mime_type, extension, hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId,
        folderId || null,
        fileName,
        file.originalname,
        filePath,
        file.size,
        file.mimetype,
        getFileExtension(file.originalname),
        fileHash,
      ]
    );

    const uploadedFile: File = fileResult.rows[0];

    // Create first version
    await client.query(
      `INSERT INTO file_versions (file_id, version, path, size, hash, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uploadedFile.id, 1, filePath, file.size, fileHash, userId]
    );

    // Update user storage
    await client.query(
      'UPDATE users SET storage_used = storage_used + $1 WHERE id = $2',
      [file.size, userId]
    );

    // Log activity
    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'file_upload', 'file', uploadedFile.id, JSON.stringify({ filename: file.originalname, size: file.size })]
    );

    await client.query('COMMIT');

    return uploadedFile;
  } catch (error) {
    await client.query('ROLLBACK');
    // Clean up local file if it still exists
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get file by ID
 */
export const getFileById = async (fileId: string, userId?: string): Promise<File | null> => {
  let queryText = 'SELECT * FROM files WHERE id = $1 AND is_deleted = false';
  const params: any[] = [fileId];

  if (userId) {
    queryText += ' AND user_id = $2';
    params.push(userId);
  }

  const result = await query(queryText, params);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

/**
 * Get user files with pagination
 */
export const getUserFiles = async (
  userId: string,
  folderId?: string,
  page: number = 1,
  limit: number = 20,
  sortBy: string = 'created_at',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<PaginatedResponse<File>> => {
  const offset = (page - 1) * limit;

  let queryText = `
    SELECT * FROM files
    WHERE user_id = $1 AND is_deleted = false
  `;
  const params: any[] = [userId];
  let paramIndex = 2;

  if (folderId) {
    queryText += ` AND folder_id = $${paramIndex}`;
    params.push(folderId);
    paramIndex++;
  } else {
    queryText += ' AND folder_id IS NULL';
  }

  // Count total
  const countResult = await query(
    queryText.replace('SELECT *', 'SELECT COUNT(*)'),
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get files
  queryText += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const filesResult = await query(queryText, params);

  return {
    data: filesResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Search files
 */
export const searchFiles = async (
  userId: string,
  searchTerm: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<File>> => {
  const offset = (page - 1) * limit;

  const queryText = `
    SELECT * FROM files
    WHERE user_id = $1 AND is_deleted = false
    AND (original_name ILIKE $2 OR extension ILIKE $2)
    ORDER BY created_at DESC
    LIMIT $3 OFFSET $4
  `;

  const countQuery = `
    SELECT COUNT(*) FROM files
    WHERE user_id = $1 AND is_deleted = false
    AND (original_name ILIKE $2 OR extension ILIKE $2)
  `;

  const searchPattern = `%${searchTerm}%`;

  const [filesResult, countResult] = await Promise.all([
    query(queryText, [userId, searchPattern, limit, offset]),
    query(countQuery, [userId, searchPattern]),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);

  return {
    data: filesResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Delete file (soft delete)
 */
export const deleteFile = async (fileId: string, userId: string): Promise<void> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get file info
    const fileResult = await client.query(
      'SELECT * FROM files WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [fileId, userId]
    );

    if (fileResult.rows.length === 0) {
      throw new Error('File not found');
    }

    const file: File = fileResult.rows[0];

    // Soft delete
    await client.query(
      'UPDATE files SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [fileId]
    );

    // Update user storage
    await client.query(
      'UPDATE users SET storage_used = storage_used - $1 WHERE id = $2',
      [file.size, userId]
    );

    // Log activity
    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'file_delete', 'file', fileId, JSON.stringify({ filename: file.original_name })]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Permanently delete file
 */
export const permanentlyDeleteFile = async (fileId: string, userId: string): Promise<void> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get file info
    const fileResult = await client.query(
      'SELECT * FROM files WHERE id = $1 AND user_id = $2',
      [fileId, userId]
    );

    if (fileResult.rows.length === 0) {
      throw new Error('File not found');
    }

    const file: File = fileResult.rows[0];

    // Delete file from storage
    if (config.upload.useSupabaseStorage) {
      // Delete from Supabase Storage
      await StorageService.deleteFile(file.path);
      
      // Delete all versions from Supabase Storage
      const versionsResult = await client.query(
        'SELECT path FROM file_versions WHERE file_id = $1',
        [fileId]
      );

      for (const version of versionsResult.rows) {
        try {
          await StorageService.deleteFile(version.path);
        } catch (error) {
          console.error('Error deleting version from Supabase:', error);
        }
      }
    } else {
      // Delete file from disk
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      // Delete all versions from disk
      const versionsResult = await client.query(
        'SELECT path FROM file_versions WHERE file_id = $1',
        [fileId]
      );

      for (const version of versionsResult.rows) {
        if (fs.existsSync(version.path)) {
          fs.unlinkSync(version.path);
        }
      }
    }

    // Delete from database (cascade will handle related records)
    await client.query('DELETE FROM files WHERE id = $1', [fileId]);

    // Update user storage if not already deleted
    if (!file.is_deleted) {
      await client.query(
        'UPDATE users SET storage_used = storage_used - $1 WHERE id = $2',
        [file.size, userId]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get file download path
 */
export const getFileDownloadPath = async (fileId: string): Promise<string> => {
  const result = await query('SELECT path FROM files WHERE id = $1 AND is_deleted = false', [
    fileId,
  ]);

  if (result.rows.length === 0) {
    throw new Error('File not found');
  }

  return result.rows[0].path;
};

/**
 * Rename file
 */
export const renameFile = async (
  fileId: string,
  userId: string,
  newName: string
): Promise<File> => {
  const result = await query(
    `UPDATE files
     SET original_name = $1, extension = $2
     WHERE id = $3 AND user_id = $4 AND is_deleted = false
     RETURNING *`,
    [newName, getFileExtension(newName), fileId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('File not found');
  }

  return result.rows[0];
};

/**
 * Move file to folder
 */
export const moveFile = async (
  fileId: string,
  userId: string,
  folderId?: string
): Promise<File> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Verify folder exists if provided
    if (folderId) {
      const folderResult = await client.query(
        'SELECT id FROM folders WHERE id = $1 AND user_id = $2 AND is_deleted = false',
        [folderId, userId]
      );

      if (folderResult.rows.length === 0) {
        throw new Error('Folder not found');
      }
    }

    // Move file
    const result = await client.query(
      'UPDATE files SET folder_id = $1 WHERE id = $2 AND user_id = $3 AND is_deleted = false RETURNING *',
      [folderId || null, fileId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('File not found');
    }

    // Log activity
    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'file_move', 'file', fileId, JSON.stringify({ folder_id: folderId })]
    );

    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

