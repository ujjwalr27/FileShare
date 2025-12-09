import { Response } from 'express';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, asyncHandler } from '../utils/response';
import * as fileService from '../services/fileService';
import { query } from '../config/database';
import mlService from '../services/mlService';
import config from '../config';
import { isTextFile, extractTextFromFile } from '../utils/textExtractor';
import StorageService from '../services/storageService';

/**
 * Upload file
 */
export const uploadFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  if (!req.file) {
    return sendError(res, 'No file uploaded', 400);
  }

  const { folderId } = req.body;

  try {
    const file = await fileService.uploadFile(req.user.id, req.file, folderId);

    let piiWarning = null;

    // Check for PII in text files
    if (config.ml.enabled && isTextFile(req.file.mimetype, req.file.originalname)) {
      try {
        const textContent = await extractTextFromFile(req.file.path);
        if (textContent) {
          const piiResult = await mlService.detectPII(textContent);
          
          if (piiResult.has_pii) {
            piiWarning = {
              has_pii: true,
              risk_level: piiResult.risk_level,
              summary: piiResult.summary,
              message: `This file contains personal information (${piiResult.risk_level} risk)`
            };

            // Save PII detection result to file metadata
            await query(
              `UPDATE files SET metadata = jsonb_set(
                 COALESCE(metadata, '{}'::jsonb),
                 '{pii_detection}',
                 $1::jsonb
               )
               WHERE id = $2`,
              [JSON.stringify({
                has_pii: true,
                risk_level: piiResult.risk_level,
                summary: piiResult.summary,
                detected_at: new Date().toISOString()
              }), file.id]
            );

            console.log(`⚠️ PII detected in file ${file.id}: ${piiResult.risk_level} risk`);
          }
        }
      } catch (error) {
        console.log('PII detection failed:', error);
      }
    }

    // Auto-categorize file using ML service (async, don't block response)
    if (config.ml.enabled) {
      mlService.categorizeFile(req.file.mimetype, req.file.originalname.split('.').pop() || '')
        .then(async (mlResult) => {
          try {
            // Update file with ML category and tags
            await query(
              `UPDATE files SET metadata = jsonb_set(
                 COALESCE(metadata, '{}'::jsonb),
                 '{ml_category}',
                 $1::jsonb
               )
               WHERE id = $2`,
              [JSON.stringify({
                category: mlResult.category,
                confidence: mlResult.confidence,
                tags: mlResult.tags,
                is_sensitive: mlResult.is_sensitive,
                categorized_at: new Date().toISOString()
              }), file.id]
            );
            console.log(`✅ File ${file.id} categorized as: ${mlResult.category}`);
          } catch (error) {
            console.error('Failed to save ML categorization:', error);
          }
        })
        .catch((error) => {
          console.log('ML categorization unavailable:', error.message);
        });
    }

    // Return response with optional PII warning
    return sendSuccess(res, { file, pii_warning: piiWarning }, 'File uploaded successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Get user files
 */
export const getFiles = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const {
    folderId,
    page = '1',
    limit = '20',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = req.query;

  const files = await fileService.getUserFiles(
    req.user.id,
    folderId as string,
    parseInt(page as string, 10),
    parseInt(limit as string, 10),
    sortBy as string,
    sortOrder as 'asc' | 'desc'
  );

  return sendSuccess(res, files);
});

/**
 * Search files
 */
export const searchFiles = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { q, page = '1', limit = '20', useML = 'true' } = req.query;

  if (!q) {
    return sendError(res, 'Search query is required', 400);
  }

  // Try semantic search if ML service is enabled
  if (config.ml.enabled && useML === 'true') {
    try {
      // Check if ML service is available
      const isAvailable = await mlService.isAvailable();
      
      if (isAvailable) {
        // Get all user files for semantic search
        const allFiles = await fileService.getUserFiles(req.user.id, undefined, 1, 1000, 'created_at', 'desc');
        
        if (allFiles.data.length > 0) {
          // Perform semantic search
          const semanticResults = await mlService.semanticSearch(
            q as string,
            allFiles.data.map(f => ({
              id: f.id,
              name: f.original_name,
              description: f.metadata?.description || ''
            })),
            { threshold: 0.3, top_k: parseInt(limit as string, 10) }
          );
          
          if (semanticResults.length > 0) {
            // Get full file details for semantic results
            const fileIds = semanticResults.map(r => r.file_id);
            const detailedFiles = allFiles.data.filter(f => fileIds.includes(f.id));
            
            // Add relevance scores
            const filesWithScores = detailedFiles.map(file => {
              const result = semanticResults.find(r => r.file_id === file.id);
              return {
                ...file,
                relevance_score: result?.similarity || 0
              };
            });
            
            console.log(`✅ Semantic search found ${filesWithScores.length} results`);
            
            return sendSuccess(res, {
              data: filesWithScores,
              pagination: {
                page: 1,
                limit: filesWithScores.length,
                total: filesWithScores.length,
                totalPages: 1
              },
              search_type: 'semantic'
            });
          }
        }
      }
    } catch (error) {
      console.log('Semantic search failed, falling back to keyword search:', error);
    }
  }

  // Fallback to keyword search
  const files = await fileService.searchFiles(
    req.user.id,
    q as string,
    parseInt(page as string, 10),
    parseInt(limit as string, 10)
  );

  return sendSuccess(res, {
    ...files,
    search_type: 'keyword'
  });
});

/**
 * Get file by ID
 */
export const getFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { id } = req.params;

  const file = await fileService.getFileById(id, req.user.id);

  if (!file) {
    return sendError(res, 'File not found', 404);
  }

  return sendSuccess(res, file);
});

/**
 * Download file
 */
export const downloadFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { id } = req.params;

  const file = await fileService.getFileById(id, req.user.id);

  if (!file) {
    return sendError(res, 'File not found', 404);
  }

  const filePath = await fileService.getFileDownloadPath(id);

  // Log download activity
  await query(
    `INSERT INTO activity_logs (user_id, action, resource_type, resource_id)
     VALUES ($1, $2, $3, $4)`,
    [req.user.id, 'file_download', 'file', id]
  );

  // Check if using Supabase Storage
  if (config.upload.useSupabaseStorage) {
    // Download from Supabase Storage
    const fileBuffer = await StorageService.downloadFile(filePath);
    
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Length', fileBuffer.length.toString());
    
    return res.send(fileBuffer);
  } else {
    // Serve from local disk
    return res.download(filePath, file.original_name);
  }
});

/**
 * Delete file
 */
export const deleteFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { id } = req.params;

  try {
    await fileService.deleteFile(id, req.user.id);

    return sendSuccess(res, null, 'File deleted successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Rename file
 */
export const renameFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return sendError(res, 'File name is required', 400);
  }

  try {
    const file = await fileService.renameFile(id, req.user.id, name);

    return sendSuccess(res, file, 'File renamed successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});

/**
 * Move file
 */
export const moveFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { id } = req.params;
  const { folderId } = req.body;

  try {
    const file = await fileService.moveFile(id, req.user.id, folderId);

    return sendSuccess(res, file, 'File moved successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
});
