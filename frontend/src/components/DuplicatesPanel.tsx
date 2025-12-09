import React, { useState, useEffect } from 'react';
import { Copy, Trash2, X, AlertCircle } from 'lucide-react';
import mlService from '../services/mlService';
import toast from 'react-hot-toast';

interface DuplicateFile {
  id: string;
  name: string;
  original_name: string;
  size: number;
  hash: string;
  created_at: string;
  is_exact_duplicate: boolean;
}

interface DuplicatesData {
  exact_duplicates: DuplicateFile[][];
  total_duplicates: number;
  storage_wasted: number;
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
    hour: '2-digit',
    minute: '2-digit',
  });
};

const DuplicatesPanel: React.FC = () => {
  const [duplicates, setDuplicates] = useState<DuplicatesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const loadDuplicates = async () => {
    setIsLoading(true);
    try {
      const response = await mlService.findDuplicates();
      console.log('Duplicates response:', response);
      // The response structure is { data: { exact_duplicates, total_duplicates, storage_wasted } }
      const data = response.data || response;
      setDuplicates(data);
    } catch (error: any) {
      console.error('Duplicates error:', error);
      toast.error(error.response?.data?.error || 'Failed to find duplicates');
      // Set empty state on error
      setDuplicates({ exact_duplicates: [], total_duplicates: 0, storage_wasted: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDuplicates();
  }, []);

  const handleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectGroup = (group: DuplicateFile[], keepFirst: boolean = true) => {
    const newSelected = new Set(selectedFiles);
    
    // If keepFirst, select all except the first file
    const filesToSelect = keepFirst ? group.slice(1) : group;
    
    filesToSelect.forEach(file => {
      newSelected.add(file.id);
    });
    
    setSelectedFiles(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) {
      toast.error('No files selected');
      return;
    }

    if (!confirm(`Delete ${selectedFiles.size} duplicate files?`)) {
      return;
    }

    try {
      const result = await mlService.deleteDuplicates(Array.from(selectedFiles));
      toast.success(`Deleted ${result.deleted_count} files. Freed ${formatFileSize(result.space_freed)}`);
      setSelectedFiles(new Set());
      loadDuplicates();
    } catch (error: any) {
      toast.error('Failed to delete duplicates');
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Scanning for duplicates...</p>
      </div>
    );
  }

  if (!duplicates) {
    return null;
  }

  if (duplicates.exact_duplicates.length === 0) {
    return (
      <div className="p-12 text-center">
        <Copy size={64} className="mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-bold text-gray-700 mb-2">No Duplicates Found</h3>
        <p className="text-gray-500">Your files are unique. Great job keeping things organized!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-100 rounded-lg">
            <AlertCircle size={32} className="text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Duplicate Files Detected</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Duplicate Files</p>
                <p className="text-2xl font-bold text-orange-600">{duplicates.total_duplicates}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Storage Wasted</p>
                <p className="text-2xl font-bold text-red-600">{formatFileSize(duplicates.storage_wasted)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duplicate Groups</p>
                <p className="text-2xl font-bold text-gray-700">{duplicates.exact_duplicates.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {selectedFiles.size > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <span className="font-medium text-blue-900">
            {selectedFiles.size} files selected
          </span>
          <button
            onClick={handleDeleteSelected}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-all flex items-center gap-2"
          >
            <Trash2 size={18} />
            Delete Selected
          </button>
        </div>
      )}

      {/* Duplicate Groups */}
      <div className="space-y-4">
        {duplicates.exact_duplicates.map((group, groupIndex) => (
          <div key={groupIndex} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-800">Group {groupIndex + 1}</h4>
                <p className="text-sm text-gray-600">
                  {group.length} identical files • {formatFileSize(group[0].size)} each
                </p>
              </div>
              <button
                onClick={() => handleSelectGroup(group, true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Select Duplicates (Keep Oldest)
              </button>
            </div>

            <div className="divide-y divide-gray-200">
              {group.map((file, fileIndex) => (
                <div
                  key={file.id}
                  className={`px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    selectedFiles.has(file.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => handleSelectFile(file.id)}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{file.original_name}</p>
                        {fileIndex === 0 && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
                            OLDEST
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Uploaded: {formatDate(file.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DuplicatesPanel;
