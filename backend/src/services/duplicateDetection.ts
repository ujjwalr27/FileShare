import { query } from '../config/database';
import fs from 'fs';
import { generateFileHash } from '../utils/helpers';

interface DuplicateFile {
  id: string;
  name: string;
  original_name: string;
  size: number;
  hash: string;
  created_at: Date;
  is_exact_duplicate: boolean;
  similarity?: number;
}

/**
 * Find duplicate files for a user
 */
export const findDuplicates = async (userId: string): Promise<{
  exact_duplicates: Array<DuplicateFile[]>;
  total_duplicates: number;
  storage_wasted: number;
}> => {
  try {
    // Find exact duplicates by hash
    const result = await query(
      `SELECT 
         f.id, 
         f.name, 
         f.original_name, 
         f.size, 
         f.hash, 
         f.created_at,
         COUNT(*) OVER (PARTITION BY f.hash) as duplicate_count
       FROM files f
       WHERE f.user_id = $1 
         AND f.is_deleted = false
         AND f.hash IS NOT NULL
       ORDER BY f.hash, f.created_at ASC`,
      [userId]
    );

    const files = result.rows;

    // Group files by hash
    const duplicateGroups: Map<string, DuplicateFile[]> = new Map();
    let totalDuplicates = 0;
    let storageWasted = 0;

    files.forEach((file: any) => {
      if (file.duplicate_count > 1) {
        if (!duplicateGroups.has(file.hash)) {
          duplicateGroups.set(file.hash, []);
        }
        
        duplicateGroups.get(file.hash)!.push({
          id: file.id,
          name: file.name,
          original_name: file.original_name,
          size: file.size,
          hash: file.hash,
          created_at: file.created_at,
          is_exact_duplicate: true,
        });
      }
    });

    // Calculate statistics
    duplicateGroups.forEach((group) => {
      if (group.length > 1) {
        totalDuplicates += group.length - 1; // Don't count the first file
        storageWasted += (group.length - 1) * group[0].size;
      }
    });

    return {
      exact_duplicates: Array.from(duplicateGroups.values()).filter(g => g.length > 1),
      total_duplicates: totalDuplicates,
      storage_wasted: storageWasted,
    };
  } catch (error) {
    console.error('Error finding duplicates:', error);
    throw error;
  }
};

/**
 * Check if a file is a duplicate before upload
 */
export const checkDuplicateBeforeUpload = async (
  userId: string,
  filePath: string,
  fileSize: number
): Promise<{
  is_duplicate: boolean;
  existing_file?: {
    id: string;
    original_name: string;
    created_at: Date;
  };
}> => {
  try {
    // Generate hash for the new file
    const fileHash = await generateFileHash(filePath);

    // Check if file with same hash exists
    const result = await query(
      `SELECT id, original_name, created_at 
       FROM files 
       WHERE user_id = $1 
         AND hash = $2 
         AND is_deleted = false 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId, fileHash]
    );

    if (result.rows.length > 0) {
      return {
        is_duplicate: true,
        existing_file: {
          id: result.rows[0].id,
          original_name: result.rows[0].original_name,
          created_at: result.rows[0].created_at,
        },
      };
    }

    return {
      is_duplicate: false,
    };
  } catch (error) {
    console.error('Error checking duplicate:', error);
    return {
      is_duplicate: false,
    };
  }
};

/**
 * Delete duplicate files (keep the oldest one)
 */
export const deleteDuplicates = async (
  userId: string,
  fileIds: string[]
): Promise<{
  deleted_count: number;
  space_freed: number;
}> => {
  try {
    // Get file sizes before deletion
    const sizeResult = await query(
      `SELECT SUM(size) as total_size 
       FROM files 
       WHERE id = ANY($1::uuid[]) 
         AND user_id = $2 
         AND is_deleted = false`,
      [fileIds, userId]
    );

    const spaceFreed = parseInt(sizeResult.rows[0]?.total_size || '0', 10);

    // Mark files as deleted
    const deleteResult = await query(
      `UPDATE files 
       SET is_deleted = true, 
           updated_at = NOW() 
       WHERE id = ANY($1::uuid[]) 
         AND user_id = $2 
         AND is_deleted = false
       RETURNING id`,
      [fileIds, userId]
    );

    // Update user storage
    if (spaceFreed > 0) {
      await query(
        'UPDATE users SET storage_used = storage_used - $1 WHERE id = $2',
        [spaceFreed, userId]
      );
    }

    return {
      deleted_count: deleteResult.rows.length,
      space_freed: spaceFreed,
    };
  } catch (error) {
    console.error('Error deleting duplicates:', error);
    throw error;
  }
};
