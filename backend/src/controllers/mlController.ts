import { Response } from 'express';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, asyncHandler } from '../utils/response';
import mlService from '../services/mlService';
import ocrService from '../services/ocrService';
import { query } from '../config/database';
import config from '../config';
import { extractTextFromFile } from '../utils/textExtractor';
import { StorageService } from '../services/storageService';
import path from 'path';

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
    console.log('Checking ML service availability for recommendations...');
    const isAvailable = await mlService.isAvailable();

    if (!isAvailable) {
      console.log('ML service unavailable for recommendations');
      return sendSuccess(res, { recommendations: [] });
    }

    console.log(`Getting recommendations for file ${currentFile.original_name} against ${allFiles.length} files`);

    let semanticResults;
    try {
      semanticResults = await mlService.semanticSearch(
        currentFile.original_name,
        allFiles.map((f: any) => ({
          id: f.id,
          name: f.original_name,
          description: f.metadata?.description || ''
        })),
        { threshold: 0.4, top_k: 5 }
      );
      console.log(`Semantic search returned ${semanticResults?.length || 0} results`);
    } catch (mlError: any) {
      console.error('ML Service semantic search failed:', mlError.message);
      if (mlError.response) {
        console.error('ML Service response:', mlError.response.data);
      }
      return sendSuccess(res, { recommendations: [] });
    }

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
    // Check if ML service is available (with retry for cold starts)
    const isAvailable = await ocrService.isAvailable();
    if (!isAvailable) {
      return sendError(res, 'ML service is currently unavailable. Please try again in a few moments.', 503);
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

    // Download file from Supabase Storage (files are stored in cloud, not local filesystem)
    let fileBuffer: Buffer;
    try {
      console.log(`Downloading file from Supabase Storage: ${file.path}`);
      fileBuffer = await StorageService.downloadFile(file.path);
      console.log(`Downloaded file, size: ${fileBuffer.length} bytes`);
    } catch (downloadError: any) {
      console.error('Failed to download file from storage:', downloadError.message);
      return sendError(res, 'Failed to access file. Please try again.', 500);
    }

    // Extract text using OCR with file buffer
    const ocrResult = await ocrService.extractTextFromBuffer(
      fileBuffer,
      file.original_name,
      file.mime_type
    );

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
 * Automatically performs OCR for images/PDFs if not already done
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

    // Check if OCR text exists in metadata
    if (file.metadata?.ocr_text?.text) {
      console.log('Using existing OCR text from metadata');
      textContent = file.metadata.ocr_text.text;
    } else {
      // Determine file type
      const isImage = file.mime_type?.includes('image');
      const isPDF = file.mime_type?.includes('pdf');
      const textExtensions = ['.txt', '.csv', '.log', '.md', '.json', '.xml', '.html'];
      const fileExtension = path.extname(file.original_name).toLowerCase();
      const isTextFile = textExtensions.includes(fileExtension);

      if (isImage || isPDF) {
        // Automatically run OCR for images and PDFs
        console.log(`Auto-running OCR for ${isImage ? 'image' : 'PDF'} file: ${file.original_name}`);

        // Check if OCR service is available
        const ocrAvailable = await ocrService.isAvailable();
        if (!ocrAvailable) {
          return sendError(res, 'OCR service is currently unavailable. Please try again in a few moments.', 503);
        }

        // Download file from Supabase Storage
        let fileBuffer: Buffer;
        try {
          console.log(`Downloading file from storage: ${file.path}`);
          fileBuffer = await StorageService.downloadFile(file.path);
          console.log(`Downloaded file, size: ${fileBuffer.length} bytes`);
        } catch (downloadError: any) {
          console.error('Failed to download file from storage:', downloadError.message);
          return sendError(res, 'Failed to access file. Please try again.', 500);
        }

        // Extract text using OCR
        const ocrResult = await ocrService.extractTextFromBuffer(
          fileBuffer,
          file.original_name,
          file.mime_type
        );

        if (!ocrResult.success || !ocrResult.text) {
          return sendError(
            res,
            ocrResult.error || 'Could not extract text from this file. The image may be unclear or contain no readable text.',
            400
          );
        }

        textContent = ocrResult.text;
        console.log(`OCR extracted ${ocrResult.word_count} words`);

        // Save OCR result to metadata for future use
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
      } else if (isTextFile) {
        // Extract text for text-based files
        textContent = await extractTextFromFile(file.path) || '';
      } else {
        // Unsupported file type
        return sendError(
          res,
          'This file type is not supported for summarization. Supported types: images, PDFs, and text files (.txt, .csv, .md, .json, .xml, .html)',
          400
        );
      }
    }

    if (!textContent || textContent.length < 50) {
      return sendError(res, 'Not enough text content to summarize. The file may be too short or contain no readable text.', 400);
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
