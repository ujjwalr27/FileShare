import api from './api';

export const mlService = {
  /**
   * Get file recommendations
   */
  getRecommendations: async (fileId: string) => {
    const response = await api.get(`/ml/recommendations/${fileId}`);
    return response.data;
  },

  /**
   * Scan file for PII
   */
  scanFileForPII: async (fileId: string) => {
    const response = await api.post(`/ml/scan-pii/${fileId}`);
    return response.data;
  },

  /**
   * Get ML statistics
   */
  getMLStats: async () => {
    const response = await api.get('/ml/stats');
    return response.data;
  },

  /**
   * Extract text from file using OCR
   */
  extractTextOCR: async (fileId: string) => {
    const response = await api.post(`/ml/ocr/${fileId}`);
    return response.data.data;
  },

  /**
   * Summarize file content
   */
  summarizeFile: async (fileId: string, options?: { num_sentences?: number; format?: string }) => {
    const params = new URLSearchParams();
    if (options?.num_sentences) params.append('num_sentences', options.num_sentences.toString());
    if (options?.format) params.append('format', options.format);
    
    const response = await api.get(`/ml/summarize/${fileId}?${params.toString()}`);
    return response.data.data;
  },
};

export default mlService;
