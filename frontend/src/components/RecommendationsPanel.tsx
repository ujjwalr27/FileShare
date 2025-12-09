import React, { useState, useEffect } from 'react';
import { Sparkles, Download, Share2, X } from 'lucide-react';
import mlService from '../services/mlService';
import toast from 'react-hot-toast';

interface RecommendationFile {
  id: string;
  original_name: string;
  size: number;
  mime_type: string;
  created_at: string;
  similarity: number;
  reason: string;
  // Additional properties from File interface for compatibility
  user_id?: string;
  folder_id?: string;
  name?: string;
  path?: string;
  extension?: string;
  hash?: string;
  version?: number;
  is_deleted?: boolean;
  deleted_at?: string;
  updated_at?: string;
  metadata?: any;
  pii_warning?: boolean;
}

interface RecommendationsPanelProps {
  fileId: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: RecommendationFile) => void;
  onShare: (file: RecommendationFile) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  fileId,
  fileName,
  isOpen,
  onClose,
  onDownload,
  onShare,
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && fileId) {
      loadRecommendations();
    }
  }, [isOpen, fileId]);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const response = await mlService.getRecommendations(fileId);
      console.log('Recommendations:', response);
      const data = response.data || response;
      setRecommendations(data.recommendations || []);
    } catch (error: any) {
      console.error('Recommendations error:', error);
      toast.error('Failed to load recommendations');
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'text-green-600 bg-green-50';
    if (similarity >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Sparkles size={24} className="text-purple-600" />
              Related Files
            </h2>
            <p className="text-sm text-gray-600 mt-1">Similar to: {fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-white rounded-full p-2 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Finding similar files...</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <Sparkles size={64} className="text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-700 mb-2">No Similar Files Found</h3>
              <p className="text-gray-500">Upload more files to get recommendations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((file) => (
                <div
                  key={file.id}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-md transition-all bg-gradient-to-r from-white to-purple-50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 truncate">{file.original_name}</h4>
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${getSimilarityColor(file.similarity)}`}>
                          {(file.similarity * 100).toFixed(0)}% Match
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{formatDate(file.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 italic">{file.reason}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onShare(file)}
                        className="p-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all"
                        title="Share"
                      >
                        <Share2 size={16} />
                      </button>
                      <button
                        onClick={() => onDownload(file)}
                        className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecommendationsPanel;
