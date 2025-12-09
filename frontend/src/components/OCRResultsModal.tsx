import React, { useState } from 'react';
import { X, Copy, Download, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface OCRResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  result: {
    text: string;
    word_count: number;
    confidence: number;
    page_count?: number;
  };
}

const OCRResultsModal: React.FC<OCRResultsModalProps> = ({
  isOpen,
  onClose,
  fileName,
  result,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    toast.success('Text copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([result.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_extracted.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded as text file!');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50';
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              📝 Extracted Text
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
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Words Extracted</p>
              <p className="text-2xl font-bold text-blue-600">{result.word_count}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Confidence</p>
              <p className={`text-2xl font-bold px-3 py-1 rounded-full inline-block ${getConfidenceColor(result.confidence)}`}>
                {result.confidence.toFixed(1)}%
              </p>
            </div>
            {result.page_count && (
              <div className="text-center">
                <p className="text-sm text-gray-600">Pages</p>
                <p className="text-2xl font-bold text-gray-700">{result.page_count}</p>
              </div>
            )}
          </div>
        </div>

        {/* Text Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
            <textarea
              readOnly
              value={result.text}
              className="w-full h-96 p-4 bg-white border border-gray-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="No text extracted"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Download size={20} />
            Download as TXT
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

export default OCRResultsModal;
