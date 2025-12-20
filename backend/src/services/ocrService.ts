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
  error?: string;
}

interface SummarizationResult {
  summary: string;
  original_length: number;
  summary_length: number;
  compression_ratio: number;
  success: boolean;
  error?: string;
}

interface BulletPointsResult {
  bullets: string[];
  num_points: number;
  original_length: number;
  success: boolean;
  error?: string;
}

class OCRService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.ml.url || 'http://127.0.0.1:8001';
  }

  /**
   * Check if OCR service is available with retry for cold starts
   */
  async isAvailable(): Promise<boolean> {
    const maxRetries = 5;
    // Progressive timeouts: 5s, 10s, 15s, 20s, 30s
    // Total wait time potential > 1 minute covering Render cold starts
    const timeouts = [5000, 10000, 15000, 20000, 30000];

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`Checking ML service health (attempt ${i + 1}/${maxRetries})...`);
        const response = await axios.get(`${this.baseUrl}/health`, {
          timeout: timeouts[i] || 30000,
          validateStatus: (status) => status < 500 // Accept any non-5xx response
        });

        // Check if service is ready (not just starting)
        if (response.data?.status === 'ready' || response.status === 200) {
          console.log('ML service is ready!');
          return true;
        }

        // Service is starting, wait a bit and retry
        if (response.data?.status === 'starting' && i < maxRetries - 1) {
          console.log('ML service is starting...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        return response.status === 200;
      } catch (error: any) {
        console.log(`ML service health check attempt ${i + 1} failed:`, error.code || error.message);
        if (i < maxRetries - 1) {
          // Wait longer between retries
          const waitTime = 3000 * (i + 1);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    return false;
  }

  /**
   * Extract text from file buffer (for files stored in cloud storage)
   */
  async extractTextFromBuffer(fileBuffer: Buffer, filename: string, mimeType: string): Promise<OCRResult> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: filename,
        contentType: mimeType,
      });

      const response = await axios.post(
        `${this.baseUrl}/api/ocr/extract-text`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 120000, // 120 seconds for OCR (2 minutes)
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      return response.data.data;
    } catch (error: any) {
      console.error('OCR extraction failed:', error.message);

      // Handle timeout errors
      if (error.code === 'ECONNABORTED') {
        return {
          text: '',
          word_count: 0,
          confidence: 0,
          success: false,
          error: 'OCR request timed out. The file may be too large or complex.'
        };
      }

      // Handle network errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          text: '',
          word_count: 0,
          confidence: 0,
          success: false,
          error: 'ML service is currently unavailable. Please try again later.'
        };
      }

      // Handle 503 (service unavailable - cold start)
      if (error.response?.status === 503) {
        return {
          text: '',
          word_count: 0,
          confidence: 0,
          success: false,
          error: 'ML service is starting up. Please wait a moment and try again.'
        };
      }

      // Handle other errors
      return {
        text: '',
        word_count: 0,
        confidence: 0,
        success: false,
        error: error.response?.data?.detail || error.response?.data?.message || 'OCR extraction failed. Please try again.'
      };
    }
  }

  /**
   * Extract text from local file path (legacy - for local development)
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

      // Handle timeout errors
      if (error.code === 'ECONNABORTED') {
        return {
          text: '',
          word_count: 0,
          confidence: 0,
          success: false,
          error: 'OCR request timed out. The file may be too large or complex.'
        };
      }

      // Handle network errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          text: '',
          word_count: 0,
          confidence: 0,
          success: false,
          error: 'ML service is currently unavailable. Please try again later.'
        };
      }

      // Handle other errors
      return {
        text: '',
        word_count: 0,
        confidence: 0,
        success: false,
        error: error.response?.data?.message || 'OCR extraction failed. Please try again.'
      };
    }
  }

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
        return {
          summary: '',
          original_length: 0,
          summary_length: 0,
          compression_ratio: 0,
          success: false,
          error: 'Summarization timed out - the document may be too large or the model is still loading'
        };
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          summary: '',
          original_length: 0,
          summary_length: 0,
          compression_ratio: 0,
          success: false,
          error: 'Summarization service is currently unavailable'
        };
      }

      return {
        summary: '',
        original_length: 0,
        summary_length: 0,
        compression_ratio: 0,
        success: false,
        error: error.response?.data?.message || 'Summarization failed'
      };
    }
  }

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
        return {
          bullets: [],
          num_points: 0,
          original_length: 0,
          success: false,
          error: 'Bullet point generation timed out - the document may be too large or the model is still loading'
        };
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          bullets: [],
          num_points: 0,
          original_length: 0,
          success: false,
          error: 'Bullet point generation service is currently unavailable'
        };
      }

      return {
        bullets: [],
        num_points: 0,
        original_length: 0,
        success: false,
        error: error.response?.data?.message || 'Bullet point generation failed'
      };
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
