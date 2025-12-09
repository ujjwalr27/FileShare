import axios from 'axios';
import config from '../config';
import FormData from 'form-data';
import fs from 'fs';

interface OCRResult {
  text: string;
  word_count: number;
  confidence: number;
  page_count?: number;
  success: boolean;
}

interface SummarizationResult {
  summary: string;
  original_length: number;
  summary_length: number;
  compression_ratio: number;
  success: boolean;
}

interface BulletPointsResult {
  bullets: string[];
  num_points: number;
  original_length: number;
  success: boolean;
}

class OCRService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.ml.url || 'http://127.0.0.1:8001';
  }

  /**
   * Check if OCR service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 2000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Extract text from image or PDF using OCR
   */
  async extractText(filePath: string, mimeType: string): Promise<OCRResult> {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));

      const response = await axios.post(
        `${this.baseUrl}/api/ocr/extract-text`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 120000, // 120 seconds for OCR (2 minutes)
        }
      );

      return response.data.data;
    } catch (error: any) {
      console.error('OCR extraction failed:', error.message);
      throw new Error('OCR service unavailable');
    }
  }

  /**
   * Summarize text content
   */
  async summarizeText(
    text: string,
    options: {
      max_length?: number;
      min_length?: number;
      num_sentences?: number;
    } = {}
  ): Promise<SummarizationResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/summarization/summarize`,
        {
          text,
          max_length: options.max_length || 150,
          min_length: options.min_length || 50,
          num_sentences: options.num_sentences,
        },
        { timeout: 300000 } // 300 seconds (5 minutes) for summarization - allows for model loading
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Summarization failed:', error.message);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Summarization timed out - the document may be too large or the model is still loading');
      }
      throw new Error('Summarization service unavailable');
    }
  }

  /**
   * Generate bullet-point summary
   */
  async generateBulletPoints(text: string, numPoints: number = 5): Promise<BulletPointsResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/summarization/bullet-points`,
        {
          text,
          num_points: numPoints,
        },
        { timeout: 300000 } // 300 seconds (5 minutes) - allows for model loading
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Bullet point generation failed:', error.message);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Bullet point generation timed out - the document may be too large or the model is still loading');
      }
      throw new Error('Bullet point generation service unavailable');
    }
  }

  /**
   * Extract key points from text
   */
  async extractKeyPoints(text: string, topK: number = 3): Promise<string[]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/summarization/key-points`,
        {
          text,
          top_k: topK,
        },
        { timeout: 30000 }
      );

      return response.data.data.key_points;
    } catch (error: any) {
      console.error('Key point extraction failed:', error.message);
      throw new Error('Key point extraction service unavailable');
    }
  }
}

export default new OCRService();
