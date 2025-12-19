import { Response } from 'express';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, asyncHandler } from '../utils/response';
import mlService from '../services/mlService';
import ocrService from '../services/ocrService';
import * as duplicateDetection from '../services/duplicateDetection';
import { query } from '../config/database';
import config from '../config';
import { extractTextFromFile } from '../utils/textExtractor';
import path from 'path';

/**
 * Find duplicate files
 */
export const findDuplicates = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  try {
    const result = await duplicateDetection.findDuplicates(req.user.id);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
});

/**
 * Delete duplicate files
 */
export const deleteDuplicates = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { fileIds } = req.body;

  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    return sendError(res, 'File IDs are required', 400);
  }

  try {
    const result = await duplicateDetection.deleteDuplicates(req.user.id, fileIds);
    return sendSuccess(res, result, `Deleted ${result.deleted_count} duplicate files`);
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
});

/**
 * Get file recommendations
 */
export const getRecommendations = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { fileId } = req.params;

  if (!config.ml.enabled) {
    return sendSuccess(res, { recommendations: [] });
  }

  try {
    // Get current file details
    const fileResult = await query(
      'SELECT id, original_name, metadata FROM files WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [fileId, req.user.id]
    );

    if (fileResult.rows.length === 0) {
      return sendError(res, 'File not found', 404);
    }

    const currentFile = fileResult.rows[0];

    // Get all user files
    const allFilesResult = await query(
      'SELECT id, original_name, metadata FROM files WHERE user_id = $1 AND is_deleted = false AND id != $2 LIMIT 100',
      [req.user.id, fileId]
    );

    const allFiles = allFilesResult.rows;

    if (allFiles.length === 0) {
      return sendSuccess(res, { recommendations: [] });
    }

    // Use semantic search to find similar files
    const isAvailable = await mlService.isAvailable();

    if (!isAvailable) {
      return sendSuccess(res, { recommendations: [] });
    }

    const semanticResults = await mlService.semanticSearch(
      currentFile.original_name,
      allFiles.map((f: any) => ({
        id: f.id,
        name: f.original_name,
        description: f.metadata?.description || ''
      })),
      { threshold: 0.4, top_k: 5 }
    );

    // Get full file details for recommendations
    const recommendedIds = semanticResults.map(r => r.file_id);

    if (recommendedIds.length === 0) {
      return sendSuccess(res, { recommendations: [] });
    }

    const recommendedFilesResult = await query(
      `SELECT id, original_name, size, mime_type, created_at, metadata 
       FROM files 
       WHERE id = ANY($1::uuid[]) 
       ORDER BY created_at DESC`,
      [recommendedIds]
    );

    const recommendations = recommendedFilesResult.rows.map((file: any) => {
      const result = semanticResults.find(r => r.file_id === file.id);
      return {
        ...file,
        similarity: result?.similarity || 0,
        reason: 'Similar content or filename'
      };
    });

    return sendSuccess(res, {
      recommendations,
      based_on: currentFile.original_name
    });
  } catch (error: any) {
    console.error('Error getting recommendations:', error);
    return sendSuccess(res, { recommendations: [] });
  }
});

/**
 * Scan file for PII
 */
export const scanFileForPII = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { fileId } = req.params;

  if (!config.ml.enabled) {
    return sendError(res, 'ML service is not enabled', 400);
  }

  try {
    // Get file details
    const fileResult = await query(
      'SELECT id, path, mime_type, original_name FROM files WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [fileId, req.user.id]
    );

    if (fileResult.rows.length === 0) {
      return sendError(res, 'File not found', 404);
    }

    const file = fileResult.rows[0];

    // Check if it's a text file
    const { isTextFile, extractTextFromFile } = require('../utils/textExtractor');

    if (!isTextFile(file.mime_type, file.original_name)) {
      return sendError(res, 'PII detection only works on text files', 400);
    }

    // Extract text
    const textContent = await extractTextFromFile(file.path);

    if (!textContent) {
      return sendError(res, 'Could not extract text from file', 400);
    }

    // Detect PII
    const piiResult = await mlService.detectPII(textContent);

    // Save result to metadata
    if (piiResult.has_pii) {
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
        }), fileId]
      );
    }

    return sendSuccess(res, piiResult);
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
});

/**
 * Get ML statistics for user
 */
export const getMLStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  try {
    // Get category distribution
    const categoryResult = await query(
      `SELECT 
         metadata->'ml_category'->>'category' as category,
         COUNT(*) as count
       FROM files 
       WHERE user_id = $1 
         AND is_deleted = false 
         AND metadata->'ml_category' IS NOT NULL
       GROUP BY category
       ORDER BY count DESC`,
      [req.user.id]
    );

    // Get PII files count
    const piiResult = await query(
      `SELECT 
         metadata->'pii_detection'->>'risk_level' as risk_level,
         COUNT(*) as count
       FROM files 
       WHERE user_id = $1 
         AND is_deleted = false 
         AND metadata->'pii_detection'->>'has_pii' = 'true'
       GROUP BY risk_level`,
      [req.user.id]
    );

    return sendSuccess(res, {
      categories: categoryResult.rows,
      pii_files: piiResult.rows,
      ml_enabled: config.ml.enabled
    });
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
});

/**
 * Extract text from file using OCR
 */
export const extractTextOCR = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { fileId } = req.params;

  if (!config.ml.enabled) {
    return sendError(res, 'ML service is not enabled', 400);
  }

  try {
    // Check if ML service is available
    const isAvailable = await ocrService.isAvailable();
    if (!isAvailable) {
      return sendError(res, 'ML service is currently unavailable. Please try again later.', 503);
    }

    // Get file details
    const fileResult = await query(
      'SELECT id, path, mime_type, original_name FROM files WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [fileId, req.user.id]
    );

    if (fileResult.rows.length === 0) {
      return sendError(res, 'File not found', 404);
    }

    const file = fileResult.rows[0];

    // Check if it's an image or PDF
    const supportedTypes = ['image/', 'application/pdf'];
    const isSupported = supportedTypes.some(type => file.mime_type.includes(type));

    if (!isSupported) {
      return sendError(res, 'OCR only works on images and PDFs', 400);
    }

    // Extract text using OCR
    const ocrResult = await ocrService.extractText(file.path, file.mime_type);

    if (!ocrResult.success) {
      return sendError(res, ocrResult.error || 'OCR extraction failed', 500);
    }

    // Save OCR result to metadata
    if (ocrResult.text) {
      await query(
        `UPDATE files SET metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{ocr_text}',
           $1::jsonb
         )
         WHERE id = $2`,
        [JSON.stringify({
          text: ocrResult.text,
          word_count: ocrResult.word_count,
          confidence: ocrResult.confidence,
          extracted_at: new Date().toISOString()
        }), fileId]
      );
    }

    return sendSuccess(res, ocrResult);
  } catch (error: any) {
    console.error('OCR extraction error:', error);
    return sendError(res, 'Failed to extract text from file. Please try again.', 500);
  }
});

/**
 * Summarize file content
 */
export const summarizeFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  const { fileId } = req.params;
  const { num_sentences = 3, format = 'text' } = req.query;

  if (!config.ml.enabled) {
    return sendError(res, 'ML service is not enabled', 400);
  }

  try {
    // Get file details
    const fileResult = await query(
      'SELECT id, path, mime_type, original_name, metadata FROM files WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [fileId, req.user.id]
    );

    if (fileResult.rows.length === 0) {
      return sendError(res, 'File not found', 404);
    }

    const file = fileResult.rows[0];

    // Get text content
    let textContent = '';

    // Check if OCR text exists
    if (file.metadata?.ocr_text?.text) {
      textContent = file.metadata.ocr_text.text;
    } else {
      // Try to extract text for text-based files only
      const textExtensions = ['.txt', '.csv', '.log', '.md', '.json', '.xml', '.html'];
      const fileExtension = path.extname(file.original_name).toLowerCase();

      if (textExtensions.includes(fileExtension)) {
        textContent = await extractTextFromFile(file.path) || '';
      } else {
        // For PDFs, images, and other files, require OCR first
        return sendError(
          res,
          'This file type requires OCR text extraction before summarization. Please run OCR on this file first using the /api/ml/ocr/:fileId endpoint.',
          400
        );
      }
    }

    if (!textContent || textContent.length < 100) {
      return sendError(res, 'Not enough text content to summarize. The file may be too short or empty.', 400);
    }

    // Generate summary based on format
    let result;

    if (format === 'bullets') {
      result = await ocrService.generateBulletPoints(textContent, parseInt(num_sentences as string));
    } else {
      result = await ocrService.summarizeText(textContent, {
        num_sentences: parseInt(num_sentences as string)
      });
    }

    // Check if summarization was successful
    if (!result.success) {
      return sendError(res, result.error || 'Summarization failed', 500);
    }

    // Save summary to metadata
    await query(
      `UPDATE files SET metadata = jsonb_set(
         COALESCE(metadata, '{}'::jsonb),
         '{summary}',
         $1::jsonb
       )
       WHERE id = $2`,
      [JSON.stringify({
        ...result,
        format,
        generated_at: new Date().toISOString()
      }), fileId]
    );

    return sendSuccess(res, result);
  } catch (error: any) {
    console.error('Summarization error:', error);
    return sendError(res, 'Failed to summarize file. Please try again.', 500);
  }
});
