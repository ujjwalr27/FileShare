import axios, { AxiosInstance } from 'axios';
import config from '../config';

/**
 * ML Service Client
 * Communicates with the Python ML service for intelligent features
 */
class MLServiceClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 300000, // 300 second (5 minute) timeout for ML operations - allows for model loading
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Check if ML service is available with retry for cold starts
   */
  async isAvailable(): Promise<boolean> {
    const maxRetries = 3;
    // Longer timeouts for Render free tier cold starts (can take 2-5 minutes)
    const timeouts = [30000, 60000, 90000]; // 30s, 60s, 90s

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`Checking ML service health at ${this.baseURL} (attempt ${i + 1}/${maxRetries})...`);
        const response = await this.client.get('/health', {
          timeout: timeouts[i] || 90000,
          validateStatus: (status) => status < 500 // Accept any non-5xx response
        });

        // Check if service is ready (not just starting)
        if (response.data?.status === 'ready' || response.status === 200) {
          console.log('ML service is ready!');
          return true;
        }

        // Service is starting, wait a bit and retry
        if (response.data?.status === 'starting' && i < maxRetries - 1) {
          console.log('ML service is starting, waiting for models to load...');
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
          continue;
        }

        return response.status === 200;
      } catch (error: any) {
        console.log(`ML service health check attempt ${i + 1} failed:`, error.code || error.message);
        if (i < maxRetries - 1) {
          // Wait between retries - give cold start more time
          const waitTime = 10000; // 10 seconds between retries
          console.log(`Waiting ${waitTime / 1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    console.log('ML service is not available after all retries');
    return false;
  }

  /**
   * Categorize a file based on MIME type and extension
   */
  async categorizeFile(mimeType: string, extension: string): Promise<{
    category: string;
    confidence: number;
    tags: string[];
    is_sensitive: boolean;
  }> {
    try {
      const response = await this.client.post('/api/categorization/categorize', {
        mime_type: mimeType,
        extension: extension,
      });
      return response.data;
    } catch (error) {
      console.error('ML Service categorization error:', error);
      // Fallback to basic categorization
      return {
        category: 'other',
        confidence: 1.0,
        tags: ['other'],
        is_sensitive: false,
      };
    }
  }

  /**
   * Categorize multiple files at once
   */
  async categorizeBatch(files: Array<{ id: string; mime_type?: string; extension?: string }>): Promise<any[]> {
    try {
      const response = await this.client.post('/api/categorization/categorize-batch', {
        files: files,
      });
      return response.data.results;
    } catch (error) {
      console.error('ML Service batch categorization error:', error);
      return [];
    }
  }

  /**
   * Perform semantic search on files
   */
  async semanticSearch(query: string, files: Array<{ id: string; name: string; description?: string }>, options?: {
    threshold?: number;
    top_k?: number;
  }): Promise<any[]> {
    try {
      const response = await this.client.post('/api/semantic-search/search', {
        query: query,
        files: files,
        threshold: options?.threshold || 0.3,
        top_k: options?.top_k || 10,
      });
      return response.data.results;
    } catch (error) {
      console.error('ML Service semantic search error:', error);
      return [];
    }
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await this.client.post('/api/semantic-search/generate-embedding', {
        text: text,
      });
      return response.data.embedding;
    } catch (error) {
      console.error('ML Service embedding generation error:', error);
      return null;
    }
  }

  /**
   * Generate tags for a file
   */
  async generateTags(filename: string, contentPreview?: string): Promise<string[]> {
    try {
      const response = await this.client.post('/api/semantic-search/generate-tags', {
        filename: filename,
        content_preview: contentPreview,
      });
      return response.data.tags;
    } catch (error) {
      console.error('ML Service tag generation error:', error);
      return [];
    }
  }

  /**
   * Detect PII in text
   */
  async detectPII(text: string): Promise<{
    has_pii: boolean;
    risk_level: string;
    entities: any[];
    patterns: any[];
    summary: any;
  }> {
    try {
      const response = await this.client.post('/api/pii/detect', {
        text: text,
      });
      return response.data;
    } catch (error) {
      console.error('ML Service PII detection error:', error);
      return {
        has_pii: false,
        risk_level: 'low',
        entities: [],
        patterns: [],
        summary: {},
      };
    }
  }

  /**
   * Redact PII from text
   */
  async redactPII(text: string, redactionChar: string = '*'): Promise<{
    redacted_text: string;
    findings: any;
  }> {
    try {
      const response = await this.client.post('/api/pii/redact', {
        text: text,
        redaction_char: redactionChar,
      });
      return response.data;
    } catch (error) {
      console.error('ML Service PII redaction error:', error);
      return {
        redacted_text: text,
        findings: { has_pii: false },
      };
    }
  }

  /**
   * Assess file sensitivity
   */
  async assessSensitivity(text: string): Promise<{
    is_sensitive: boolean;
    risk_level: string;
    should_encrypt: boolean;
    requires_access_control: boolean;
    recommendations: string[];
  }> {
    try {
      const response = await this.client.post('/api/pii/assess-sensitivity', {
        text: text,
      });
      return response.data;
    } catch (error) {
      console.error('ML Service sensitivity assessment error:', error);
      return {
        is_sensitive: false,
        risk_level: 'low',
        should_encrypt: false,
        requires_access_control: false,
        recommendations: [],
      };
    }
  }

  /**
   * Summarize text
   */
  async summarizeText(text: string, options?: {
    maxLength?: number;
    minLength?: number;
    numSentences?: number;
  }): Promise<{
    summary: string;
    original_length: number;
    summary_length: number;
    compression_ratio: number;
    chunks_processed: number;
    document_structure: any;
    key_phrases: string[];
  }> {
    try {
      const response = await this.client.post('/api/summarization/summarize', {
        text: text,
        max_length: options?.maxLength || 150,
        min_length: options?.minLength || 50,
        num_sentences: options?.numSentences,
      });
      return response.data.data;
    } catch (error) {
      console.error('ML Service summarization error:', error);
      throw error;
    }
  }

  /**
   * Generate bullet point summary
   */
  async generateBulletPoints(text: string, numPoints: number = 5): Promise<{
    bullets: string[];
    num_points: number;
    original_length: number;
    method: string;
    key_phrases: string[];
  }> {
    try {
      const response = await this.client.post('/api/summarization/bullet-points', {
        text: text,
        num_points: numPoints,
      });
      return response.data.data;
    } catch (error) {
      console.error('ML Service bullet points error:', error);
      throw error;
    }
  }

  /**
   * Extract key points from text
   */
  async extractKeyPoints(text: string, topK: number = 3): Promise<{
    key_points: string[];
    num_points: number;
    original_length: number;
    key_phrases: string[];
  }> {
    try {
      const response = await this.client.post('/api/summarization/key-points', {
        text: text,
        top_k: topK,
      });
      return response.data.data;
    } catch (error) {
      console.error('ML Service key points extraction error:', error);
      throw error;
    }
  }

  /**
   * Comprehensive document analysis - Get everything in one call
   * Returns summary, bullet points, key points, structure, and statistics
   */
  async analyzeDocument(text: string): Promise<{
    summary: string;
    bullet_points: string[];
    key_points: string[];
    document_structure: {
      total_sentences: number;
      total_words: number;
      total_paragraphs: number;
      avg_sentence_length: number;
      headings: string[];
      has_structure: boolean;
    };
    key_phrases: string[];
    statistics: {
      total_words: number;
      total_sentences: number;
      total_characters: number;
      avg_sentence_length: number;
      estimated_reading_time_minutes: number;
    };
    compression_ratio: number;
    chunks_processed: number;
  }> {
    try {
      const response = await this.client.post('/api/summarization/analyze', {
        text: text,
      });
      return response.data.data;
    } catch (error) {
      console.error('ML Service document analysis error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new MLServiceClient();
