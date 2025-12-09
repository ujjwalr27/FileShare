import { PoolClient } from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, getClient } from '../config/database';

export interface Share {
  id: string;
  file_id: string;
  user_id: string;
  share_token: string;
  share_url: string;
  password_hash?: string;
  expires_at?: string;
  max_downloads?: number;
  download_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateShareOptions {
  fileId: string;
  userId: string;
  password?: string;
  expiresAt?: Date;
  maxDownloads?: number;
}

export interface ValidateShareOptions {
  token: string;
  password?: string;
}

/**
 * Generate a unique share token
 */
const generateShareToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate share URL from token
 */
const generateShareUrl = (token: string): string => {
  // In production, this should use your actual domain
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${baseUrl}/share/${token}`;
};

/**
 * Create a new share link for a file
 */
export const createShare = async (options: CreateShareOptions): Promise<Share> => {
  const { fileId, userId, password, expiresAt, maxDownloads } = options;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Verify file exists and belongs to user
    const fileResult = await client.query(
      'SELECT id FROM files WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [fileId, userId]
    );

    if (fileResult.rows.length === 0) {
      throw new Error('File not found or access denied');
    }

    // Generate unique token
    let token: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!isUnique && attempts < maxAttempts) {
      token = generateShareToken();
      const existingShare = await client.query(
        'SELECT id FROM shares WHERE share_token = $1',
        [token]
      );
      isUnique = existingShare.rows.length === 0;
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique share token');
    }

    // Hash password if provided
    let passwordHash: string | undefined;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Create share
    const shareUrl = generateShareUrl(token!);
    const result = await client.query(
      `INSERT INTO shares (
        file_id, user_id, share_token, share_url, password_hash,
        expires_at, max_downloads, download_count, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, true)
      RETURNING *`,
      [fileId, userId, token!, shareUrl, passwordHash, expiresAt, maxDownloads]
    );

    // Log activity
    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, metadata)
       VALUES ($1, 'create_share', 'file', $2, $3)`,
      [userId, fileId, JSON.stringify({ token: token!, hasPassword: !!password })]
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

/**
 * Get all shares for a file
 */
export const getFileShares = async (fileId: string, userId: string): Promise<Share[]> => {
  const result = await query(
    `SELECT s.* FROM shares s
     JOIN files f ON s.file_id = f.id
     WHERE s.file_id = $1 AND f.user_id = $2
     ORDER BY s.created_at DESC`,
    [fileId, userId]
  );
  return result.rows;
};

/**
 * Get all shares created by a user
 */
export const getUserShares = async (userId: string): Promise<Share[]> => {
  const result = await query(
    `SELECT s.*, f.original_name as file_name
     FROM shares s
     JOIN files f ON s.file_id = f.id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC`,
    [userId]
  );
  return result.rows;
};

/**
 * Get share by token
 */
export const getShareByToken = async (token: string): Promise<Share | null> => {
  const result = await query(
    'SELECT * FROM shares WHERE share_token = $1',
    [token]
  );
  return result.rows[0] || null;
};

/**
 * Validate share access
 */
export const validateShare = async (options: ValidateShareOptions): Promise<{
  valid: boolean;
  share?: Share;
  error?: string;
}> => {
  const { token, password } = options;

  try {
    const share = await getShareByToken(token);

    if (!share) {
      return { valid: false, error: 'Share not found' };
    }

    if (!share.is_active) {
      return { valid: false, error: 'Share link is no longer active' };
    }

    // Check expiration
    if (share.expires_at) {
      const expiryDate = new Date(share.expires_at);
      if (expiryDate < new Date()) {
        return { valid: false, error: 'Share link has expired' };
      }
    }

    // Check download limit
    if (share.max_downloads !== null && share.max_downloads !== undefined && share.download_count >= share.max_downloads) {
      return { valid: false, error: 'Download limit reached' };
    }

    // Check password
    if (share.password_hash) {
      if (!password) {
        return { valid: false, error: 'Password required' };
      }

      const isPasswordValid = await bcrypt.compare(password, share.password_hash);
      if (!isPasswordValid) {
        return { valid: false, error: 'Invalid password' };
      }
    }

    return { valid: true, share };
  } catch (error) {
    return { valid: false, error: 'Failed to validate share' };
  }
};

/**
 * Get file info for a valid share
 */
export const getSharedFile = async (token: string, password?: string): Promise<{
  success: boolean;
  file?: any;
  error?: string;
}> => {
  const validation = await validateShare({ token, password });

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const share = validation.share!;

  // Get file information
  const result = await query(
    `SELECT f.id, f.original_name, f.size, f.mime_type, f.extension, f.created_at,
            u.name as owner_name
     FROM files f
     JOIN users u ON f.user_id = u.id
     WHERE f.id = $1 AND f.is_deleted = false`,
    [share.file_id]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'File not found or has been deleted' };
  }

  return { success: true, file: result.rows[0] };
};

/**
 * Increment download count for a share
 */
export const incrementDownloadCount = async (shareId: string): Promise<void> => {
  await query(
    'UPDATE shares SET download_count = download_count + 1 WHERE id = $1',
    [shareId]
  );
};

/**
 * Update share settings
 */
export const updateShare = async (
  shareId: string,
  userId: string,
  updates: {
    password?: string;
    expiresAt?: Date;
    maxDownloads?: number;
    isActive?: boolean;
  }
): Promise<Share> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Verify ownership
    const verifyResult = await client.query(
      'SELECT id FROM shares WHERE id = $1 AND user_id = $2',
      [shareId, userId]
    );

    if (verifyResult.rows.length === 0) {
      throw new Error('Share not found or access denied');
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let valueIndex = 1;

    if (updates.password !== undefined) {
      const passwordHash = updates.password ? await bcrypt.hash(updates.password, 10) : null;
      updateFields.push(`password_hash = $${valueIndex++}`);
      updateValues.push(passwordHash);
    }

    if (updates.expiresAt !== undefined) {
      updateFields.push(`expires_at = $${valueIndex++}`);
      updateValues.push(updates.expiresAt);
    }

    if (updates.maxDownloads !== undefined) {
      updateFields.push(`max_downloads = $${valueIndex++}`);
      updateValues.push(updates.maxDownloads);
    }

    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${valueIndex++}`);
      updateValues.push(updates.isActive);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(shareId);

    const result = await client.query(
      `UPDATE shares SET ${updateFields.join(', ')}
       WHERE id = $${valueIndex}
       RETURNING *`,
      updateValues
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

/**
 * Delete a share
 */
export const deleteShare = async (shareId: string, userId: string): Promise<void> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      'DELETE FROM shares WHERE id = $1 AND user_id = $2',
      [shareId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Share not found or access denied');
    }

    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
       VALUES ($1, 'delete_share', 'share', $2)`,
      [userId, shareId]
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
 * Revoke (deactivate) a share without deleting it
 */
export const revokeShare = async (shareId: string, userId: string): Promise<Share> => {
  return updateShare(shareId, userId, { isActive: false });
};

/**
 * Clean up expired shares (can be run as a scheduled task)
 */
export const cleanupExpiredShares = async (): Promise<number> => {
  const result = await query(
    `UPDATE shares
     SET is_active = false
     WHERE is_active = true
     AND expires_at IS NOT NULL
     AND expires_at < CURRENT_TIMESTAMP`
  );
  return result.rowCount || 0;
};
