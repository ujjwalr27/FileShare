import React, { useState } from 'react';
import { X, Copy, Download, Check, FileText, List } from 'lucide-react';
import toast from 'react-hot-toast';
import mlService from '../services/mlService';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileId: string;
  initialSummary?: {
    summary?: string;
    bullets?: string[];
    original_length: number;
    summary_length?: number;
    compression_ratio?: number;
  };
}

const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  fileName,
  fileId,
  initialSummary,
}) => {
  const [summaryType, setSummaryType] = useState<'text' | 'bullets'>('text');
  const [summary, setSummary] = useState(initialSummary);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleChangeSummaryType = async (type: 'text' | 'bullets') => {
    setSummaryType(type);
    
    if (type === 'bullets' && !summary?.bullets) {
      setIsLoading(true);
      try {
        const result = await mlService.summarizeFile(fileId, { format: 'bullets', num_sentences: 5 });
        // Merge the bullet points with existing summary data
        setSummary(prev => ({
          ...prev,
          bullets: result.bullets || [],
          num_points: result.num_points,
          method: result.method
        }));
        toast.success('Bullet points generated!');
      } catch (error) {
        console.error('Failed to generate bullet points:', error);
        toast.error('Failed to generate bullet points. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCopy = () => {
    const text = summaryType === 'bullets' && summary?.bullets
      ? summary.bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')
      : summary?.summary || '';
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Summary copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = summaryType === 'bullets' && summary?.bullets
      ? `# Summary of ${fileName}\n\n${summary.bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}`
      : `# Summary of ${fileName}\n\n${summary?.summary || ''}`;
    
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_summary.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded as markdown file!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              📋 Document Summary
            </h2>
            <p className="text-sm text-gray-600 mt-1">{fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-white rounded-full p-2 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Stats */}
        {summary && summary.compression_ratio !== undefined && summary.original_length && (
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-gray-600">Original Length</p>
                <p className="text-lg font-bold text-gray-700">{summary.original_length.toLocaleString()} words</p>
              </div>
              <div className="text-2xl text-gray-400">→</div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Summary Length</p>
                <p className="text-lg font-bold text-indigo-600">{(summary.summary_length || 0).toLocaleString()} words</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Compression</p>
                <p className="text-lg font-bold text-green-600">
                  {summary.compression_ratio > 0 
                    ? `${(summary.compression_ratio * 100).toFixed(1)}% of original`
                    : 'N/A'
                  }
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Reduction</p>
                <p className="text-lg font-bold text-purple-600">
                  {summary.compression_ratio > 0 && summary.compression_ratio < 1
                    ? `${(100 - summary.compression_ratio * 100).toFixed(1)}% shorter`
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Type Selector */}
        <div className="p-4 border-b bg-white flex gap-3">
          <button
            onClick={() => handleChangeSummaryType('text')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              summaryType === 'text'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText size={18} />
            Paragraph
          </button>
          <button
            onClick={() => handleChangeSummaryType('bullets')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              summaryType === 'bullets'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <List size={18} />
            Bullet Points
          </button>
        </div>

        {/* Summary Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="text-gray-600 font-medium">
                {summaryType === 'bullets' ? 'Generating bullet points...' : 'Loading summary...'}
              </p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 border-2 border-indigo-200">
              {summaryType === 'text' ? (
                <div>
                  {summary?.summary ? (
                    <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">{summary.summary}</p>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No summary available</p>
                  )}
                </div>
              ) : (
                <div>
                  {summary?.bullets && summary.bullets.length > 0 ? (
                    <ul className="space-y-4">
                      {summary.bullets.map((bullet, index) => (
                        <li key={index} className="flex gap-3 items-start">
                          <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                            {index + 1}
                          </span>
                          <p className="text-gray-800 text-base leading-relaxed pt-1 flex-1">{bullet}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No bullet points available. Click to generate them.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
            {copied ? 'Copied!' : 'Copy Summary'}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Download size={20} />
            Download
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
