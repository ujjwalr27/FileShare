import { query, getClient } from '../config/database';
import { Folder, PaginatedResponse } from '../types';

/**
 * Create a new folder
 */
export const createFolder = async (
  userId: string,
  name: string,
  parentId?: string
): Promise<Folder> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Validate parent folder if provided
    if (parentId) {
      const parentResult = await client.query(
        'SELECT * FROM folders WHERE id = $1 AND user_id = $2 AND is_deleted = false',
        [parentId, userId]
      );

      if (parentResult.rows.length === 0) {
        throw new Error('Parent folder not found');
      }
    }

    // Check if folder with same name exists in same location
    const existingResult = await client.query(
      'SELECT id FROM folders WHERE user_id = $1 AND name = $2 AND parent_id IS NOT DISTINCT FROM $3 AND is_deleted = false',
      [userId, name, parentId || null]
    );

    if (existingResult.rows.length > 0) {
      throw new Error('Folder with this name already exists in this location');
    }

    // Build folder path
    let path = '/';
    if (parentId) {
      const parentPathResult = await client.query(
        'SELECT path FROM folders WHERE id = $1',
        [parentId]
      );
      path = parentPathResult.rows[0].path + name + '/';
    } else {
      path = '/' + name + '/';
    }

    // Insert folder
    const result = await client.query(
      `INSERT INTO folders (user_id, parent_id, name, path)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, parentId || null, name, path]
    );

    const folder: Folder = result.rows[0];

    // Log activity
    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'folder_create', 'folder', folder.id, JSON.stringify({ name, path })]
    );

    await client.query('COMMIT');

    return folder;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get folder by ID
 */
export const getFolderById = async (
  folderId: string,
  userId?: string
): Promise<Folder | null> => {
  let queryText = 'SELECT * FROM folders WHERE id = $1 AND is_deleted = false';
  const params: any[] = [folderId];

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
 * Get user folders with pagination
 */
export const getUserFolders = async (
  userId: string,
  parentId?: string,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<Folder>> => {
  const offset = (page - 1) * limit;

  let queryText = `
    SELECT * FROM folders
    WHERE user_id = $1 AND is_deleted = false
  `;
  const params: any[] = [userId];
  let paramIndex = 2;

  if (parentId) {
    queryText += ` AND parent_id = $${paramIndex}`;
    params.push(parentId);
    paramIndex++;
  } else {
    queryText += ' AND parent_id IS NULL';
  }

  // Count total
  const countResult = await query(
    queryText.replace('SELECT *', 'SELECT COUNT(*)'),
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get folders
  queryText += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const foldersResult = await query(queryText, params);

  return {
    data: foldersResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get folder contents (folders and files)
 */
export const getFolderContents = async (
  userId: string,
  folderId?: string
): Promise<{ folders: Folder[]; files: any[] }> => {
  // Get folders
  const foldersQuery = folderId
    ? 'SELECT * FROM folders WHERE user_id = $1 AND parent_id = $2 AND is_deleted = false ORDER BY name ASC'
    : 'SELECT * FROM folders WHERE user_id = $1 AND parent_id IS NULL AND is_deleted = false ORDER BY name ASC';

  const foldersParams = folderId ? [userId, folderId] : [userId];
  const foldersResult = await query(foldersQuery, foldersParams);

  // Get files
  const filesQuery = folderId
    ? 'SELECT * FROM files WHERE user_id = $1 AND folder_id = $2 AND is_deleted = false ORDER BY original_name ASC'
    : 'SELECT * FROM files WHERE user_id = $1 AND folder_id IS NULL AND is_deleted = false ORDER BY original_name ASC';

  const filesParams = folderId ? [userId, folderId] : [userId];
  const filesResult = await query(filesQuery, filesParams);

  return {
    folders: foldersResult.rows,
    files: filesResult.rows,
  };
};

/**
 * Rename folder
 */
export const renameFolder = async (
  folderId: string,
  userId: string,
  newName: string
): Promise<Folder> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get folder
    const folderResult = await client.query(
      'SELECT * FROM folders WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [folderId, userId]
    );

    if (folderResult.rows.length === 0) {
      throw new Error('Folder not found');
    }

    const folder: Folder = folderResult.rows[0];

    // Check if folder with same name exists in same location
    const existingResult = await client.query(
      'SELECT id FROM folders WHERE user_id = $1 AND name = $2 AND parent_id IS NOT DISTINCT FROM $3 AND id != $4 AND is_deleted = false',
      [userId, newName, folder.parent_id, folderId]
    );

    if (existingResult.rows.length > 0) {
      throw new Error('Folder with this name already exists in this location');
    }

    // Update folder path
    const oldPath = folder.path;
    const pathParts = oldPath.split('/').filter(Boolean);
    pathParts[pathParts.length - 1] = newName;
    const newPath = '/' + pathParts.join('/') + '/';

    // Update folder
    const updateResult = await client.query(
      'UPDATE folders SET name = $1, path = $2 WHERE id = $3 RETURNING *',
      [newName, newPath, folderId]
    );

    // Update all child folders paths
    await client.query(
      `UPDATE folders
       SET path = REPLACE(path, $1, $2)
       WHERE path LIKE $3`,
      [oldPath, newPath, oldPath + '%']
    );

    // Log activity
    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'folder_rename', 'folder', folderId, JSON.stringify({ oldName: folder.name, newName })]
    );

    await client.query('COMMIT');

    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Move folder to another location
 */
export const moveFolder = async (
  folderId: string,
  userId: string,
  newParentId?: string
): Promise<Folder> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get folder
    const folderResult = await client.query(
      'SELECT * FROM folders WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [folderId, userId]
    );

    if (folderResult.rows.length === 0) {
      throw new Error('Folder not found');
    }

    const folder: Folder = folderResult.rows[0];

    // Cannot move to itself or its children
    if (newParentId === folderId) {
      throw new Error('Cannot move folder to itself');
    }

    // Validate new parent if provided
    if (newParentId) {
      const parentResult = await client.query(
        'SELECT path FROM folders WHERE id = $1 AND user_id = $2 AND is_deleted = false',
        [newParentId, userId]
      );

      if (parentResult.rows.length === 0) {
        throw new Error('Parent folder not found');
      }

      // Check if new parent is a child of current folder
      const parentPath = parentResult.rows[0].path;
      if (parentPath.startsWith(folder.path)) {
        throw new Error('Cannot move folder to its own child');
      }
    }

    // Check if folder with same name exists in new location
    const existingResult = await client.query(
      'SELECT id FROM folders WHERE user_id = $1 AND name = $2 AND parent_id IS NOT DISTINCT FROM $3 AND id != $4 AND is_deleted = false',
      [userId, folder.name, newParentId || null, folderId]
    );

    if (existingResult.rows.length > 0) {
      throw new Error('Folder with this name already exists in destination');
    }

    // Build new path
    let newPath = '/';
    if (newParentId) {
      const parentPathResult = await client.query(
        'SELECT path FROM folders WHERE id = $1',
        [newParentId]
      );
      newPath = parentPathResult.rows[0].path + folder.name + '/';
    } else {
      newPath = '/' + folder.name + '/';
    }

    const oldPath = folder.path;

    // Update folder
    const updateResult = await client.query(
      'UPDATE folders SET parent_id = $1, path = $2 WHERE id = $3 RETURNING *',
      [newParentId || null, newPath, folderId]
    );

    // Update all child folders paths
    await client.query(
      `UPDATE folders
       SET path = REPLACE(path, $1, $2)
       WHERE path LIKE $3`,
      [oldPath, newPath, oldPath + '%']
    );

    // Log activity
    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'folder_move', 'folder', folderId, JSON.stringify({ oldPath, newPath })]
    );

    await client.query('COMMIT');

    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Delete folder (soft delete)
 */
export const deleteFolder = async (folderId: string, userId: string): Promise<void> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get folder
    const folderResult = await client.query(
      'SELECT * FROM folders WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [folderId, userId]
    );

    if (folderResult.rows.length === 0) {
      throw new Error('Folder not found');
    }

    const folder: Folder = folderResult.rows[0];

    // Soft delete folder and all children
    await client.query(
      `UPDATE folders
       SET is_deleted = true
       WHERE (id = $1 OR path LIKE $2) AND user_id = $3`,
      [folderId, folder.path + '%', userId]
    );

    // Soft delete all files in folder and subfolders
    await client.query(
      `UPDATE files
       SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP
       WHERE folder_id IN (
         SELECT id FROM folders WHERE (id = $1 OR path LIKE $2) AND user_id = $3
       )`,
      [folderId, folder.path + '%', userId]
    );

    // Get total size of deleted files
    const sizeResult = await client.query(
      `SELECT COALESCE(SUM(size), 0) as total_size
       FROM files
       WHERE folder_id IN (
         SELECT id FROM folders WHERE (id = $1 OR path LIKE $2) AND user_id = $3
       ) AND is_deleted = true`,
      [folderId, folder.path + '%', userId]
    );

    const totalSize = parseInt(sizeResult.rows[0].total_size, 10);

    // Update user storage
    if (totalSize > 0) {
      await client.query(
        'UPDATE users SET storage_used = storage_used - $1 WHERE id = $2',
        [totalSize, userId]
      );
    }

    // Log activity
    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'folder_delete', 'folder', folderId, JSON.stringify({ name: folder.name, path: folder.path })]
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
 * Get folder breadcrumb path
 */
export const getFolderBreadcrumb = async (
  folderId: string,
  userId: string
): Promise<Folder[]> => {
  const breadcrumb: Folder[] = [];

  let currentId: string | null = folderId;

  while (currentId) {
    const result = await query(
      'SELECT * FROM folders WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [currentId, userId]
    );

    if (result.rows.length === 0) {
      break;
    }

    const folder: Folder = result.rows[0];
    breadcrumb.unshift(folder);
    currentId = folder.parent_id || null;
  }

  return breadcrumb;
};
