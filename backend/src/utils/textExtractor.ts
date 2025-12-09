import fs from 'fs';
import path from 'path';

/**
 * Extract text content from files for PII detection
 */

/**
 * Check if file is a text-based file
 */
export const isTextFile = (mimeType: string, extension: string): boolean => {
  const textMimeTypes = [
    'text/plain',
    'text/csv',
    'text/html',
    'text/xml',
    'application/json',
    'application/xml',
  ];

  const textExtensions = ['.txt', '.csv', '.log', '.md', '.json', '.xml', '.html'];

  return textMimeTypes.includes(mimeType) || textExtensions.includes(extension.toLowerCase());
};

/**
 * Extract text from a text file
 */
export const extractTextFromFile = async (filePath: string): Promise<string | null> => {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      return null;
    }

    // Get file stats
    const stats = fs.statSync(filePath);

    // Limit file size for text extraction (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (stats.size > MAX_SIZE) {
      console.log('File too large for text extraction:', filePath);
      return null;
    }

    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');

    // Limit content length (first 50KB of text)
    const MAX_LENGTH = 50000;
    if (content.length > MAX_LENGTH) {
      return content.substring(0, MAX_LENGTH);
    }

    return content;
  } catch (error: any) {
    console.error('Error extracting text:', error.message);
    return null;
  }
};

/**
 * Extract preview text (first 1000 characters)
 */
export const extractTextPreview = async (filePath: string): Promise<string | null> => {
  try {
    const fullText = await extractTextFromFile(filePath);
    if (!fullText) return null;

    // Return first 1000 characters
    return fullText.substring(0, 1000);
  } catch (error) {
    return null;
  }
};
