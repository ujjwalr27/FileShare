import crypto from 'crypto';
import { createReadStream } from 'fs';

/**
 * Generate a hash for a file
 */
export const generateFileHash = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

/**
 * Generate a random token
 */
export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Format file size to human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

/**
 * Sanitize filename to prevent directory traversal
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.+/g, '.')
    .substring(0, 255);
};

/**
 * Generate unique filename
 */
export const generateUniqueFilename = (originalFilename: string): string => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const extension = getFileExtension(originalFilename);
  const baseName = originalFilename.replace(/\.[^/.]+$/, '');
  const sanitizedBaseName = sanitizeFilename(baseName);

  return `${sanitizedBaseName}_${timestamp}_${random}${extension ? '.' + extension : ''}`;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sleep utility
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Create pagination metadata
 */
export const createPaginationMeta = (
  page: number,
  limit: number,
  total: number
) => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Parse sort parameters
 */
export const parseSortParams = (
  sortBy?: string,
  sortOrder?: string
): { field: string; order: 'ASC' | 'DESC' } => {
  const allowedFields = ['name', 'size', 'created_at', 'updated_at'];
  const field = sortBy && allowedFields.includes(sortBy) ? sortBy : 'created_at';
  const order = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  return { field, order };
};
