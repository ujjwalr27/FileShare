import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fileService } from '../services/fileService';
import { folderService } from '../services/folderService';
import { File, Folder } from '../types';
import toast from 'react-hot-toast';
import {
  Upload,
  Download,
  Trash2,
  LogOut,
  Search,
  FolderOpen,
  Folder as FolderIcon,
  FolderPlus,
  Share2,
  HardDrive,
  Copy,
  ScanText,
  FileText,
  Filter,
  Sparkles
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import CreateFolderModal from '../components/CreateFolderModal';
import ShareModal from '../components/ShareModal';
import PIIWarningModal from '../components/PIIWarningModal';
import DuplicatesPanel from '../components/DuplicatesPanel';
import OCRResultsModal from '../components/OCRResultsModal';
import SummaryModal from '../components/SummaryModal';
import RecommendationsPanel from '../components/RecommendationsPanel';
import mlService from '../services/mlService';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [breadcrumb, setBreadcrumb] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    dateRange: 'all',
    hasPII: 'all',
    fileType: 'all'
  });
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [shareModalFile, setShareModalFile] = useState<{ id: string; name: string } | null>(null);
  const [showPIIModal, setShowPIIModal] = useState(false);
  const [piiWarning, setPIIWarning] = useState<any>(null);
  const [piiFile, setPIIFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'duplicates'>('files');
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [ocrResult, setOCRResult] = useState<any>(null);
  const [ocrFileName, setOCRFileName] = useState('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryFileId, setSummaryFileId] = useState('');
  const [summaryFileName, setSummaryFileName] = useState('');
  const [summaryResult, setSummaryResult] = useState<any>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendationsFileId, setRecommendationsFileId] = useState('');
  const [recommendationsFileName, setRecommendationsFileName] = useState('');

  useEffect(() => {
    loadFolderContents();
    // Refresh user data to get latest storage info
    refreshUser();
  }, [currentFolderId]);

  const refreshUser = useAuthStore((state) => state.refreshUser);

  const loadFolderContents = async () => {
    try {
      setIsLoading(true);

      // Load folder contents (both folders and files)
      // folderService already unwraps response.data.data, so we get { folders: [], files: [] } directly
      const contents = currentFolderId
        ? await folderService.getFolderContents(currentFolderId)
        : await folderService.getRootContents();

      setFolders(contents.folders || []);
      setFiles(contents.files || []);

      // Load breadcrumb if in a folder
      if (currentFolderId) {
        const breadcrumb = await folderService.getFolderBreadcrumb(currentFolderId);
        setBreadcrumb(breadcrumb || []);
      } else {
        setBreadcrumb([]);
      }
    } catch (error: any) {
      console.error('Failed to load contents:', error);
      toast.error(error.response?.data?.error || 'Failed to load contents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToFolder = (folderId?: string) => {
    setCurrentFolderId(folderId);
    setSearchQuery(''); // Clear search when navigating
  };

  const handleCreateFolder = async (name: string) => {
    try {
      await folderService.createFolder(name, currentFolderId);
      toast.success('Folder created successfully!');
      loadFolderContents();
    } catch (error: any) {
      throw error; // Let the modal handle the error
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? All contents will be deleted.')) return;

    try {
      await folderService.deleteFolder(folderId);
      toast.success('Folder deleted successfully');
      loadFolderContents();
    } catch (error) {
      toast.error('Failed to delete folder');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const response = await fileService.uploadFile(file as any, currentFolderId);

      // Check for PII warning
      if (response.pii_warning && (response.pii_warning as any).has_pii) {
        setPIIWarning(response.pii_warning);
        setPIIFile(response.file || null);
        setShowPIIModal(true);
      } else {
        toast.success('File uploaded successfully!');
      }

      loadFolderContents();
      // Refresh user data to update storage display
      refreshUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handlePIIProceed = () => {
    setShowPIIModal(false);
    toast.success('File uploaded successfully with PII warning!');
  };

  const handlePIICancel = async () => {
    setShowPIIModal(false);
    // Optionally delete the file
    if (piiFile) {
      try {
        await fileService.deleteFile(piiFile.id);
        toast('Upload cancelled, file removed', { icon: 'ℹ️' });
        loadFolderContents();
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
  };

  const handleDownload = async (file: File) => {
    try {
      await fileService.downloadFile(file.id, file.original_name);
      toast.success('Download started');
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await fileService.deleteFile(fileId);
      toast.success('File deleted successfully');
      loadFolderContents();
      // Refresh user data to update storage display
      refreshUser();
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const handleExtractText = async (fileId: string, fileName: string) => {
    const toastId = toast.loading('🔍 Extracting text from image/PDF...', {
      duration: Infinity,
      icon: '⏳'
    });

    try {
      const result = await mlService.extractTextOCR(fileId);
      toast.success(`✅ Text extracted! ${result.word_count} words found`, {
        id: toastId,
        duration: 4000
      });

      // Show result in modal
      setOCRResult(result);
      setOCRFileName(fileName);
      setShowOCRModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || '❌ OCR extraction failed', {
        id: toastId,
        duration: 4000
      });
    }
  };

  const handleSummarize = async (fileId: string, fileName: string) => {
    const toastId = toast.loading('📝 Generating summary...', {
      duration: Infinity,
      icon: '⏳'
    });

    try {
      const result = await mlService.summarizeFile(fileId, { num_sentences: 3 });
      toast.success('✅ Summary generated!', {
        id: toastId,
        duration: 4000
      });

      // Show result in modal
      setSummaryResult(result);
      setSummaryFileId(fileId);
      setSummaryFileName(fileName);
      setShowSummaryModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || '❌ Summarization failed', {
        id: toastId,
        duration: 4000
      });
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadFolderContents();
      return;
    }

    try {
      const response = await fileService.searchFiles(searchQuery);
      // Backend returns { success: true, data: { data: [...], pagination: {...} } }
      // fileService returns response.data.data which is the PaginatedResponse
      // So response here is the PaginatedResponse, and we need response.data
      setFiles(response.data || []);
      setFolders([]); // Clear folders during search
    } catch (error: any) {
      console.error('Search failed:', error);
      toast.error(error.response?.data?.error || 'Search failed');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatFileSize = (bytes: number | null | undefined): string => {
    // Handle NaN, undefined, null, or invalid values
    if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) {
      return '0 Bytes';
    }
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter files based on selected filters
  const applyFilters = (filesToFilter: File[]): File[] => {
    return filesToFilter.filter((file) => {
      // Category filter
      if (filters.category !== 'all') {
        const mimeType = file.mime_type?.toLowerCase() || '';
        let matches = false;

        switch (filters.category) {
          case 'documents':
            matches = mimeType.includes('pdf') || mimeType.includes('document') ||
              mimeType.includes('text') || mimeType.includes('msword') ||
              mimeType.includes('wordprocessingml');
            break;
          case 'images':
            matches = mimeType.includes('image');
            break;
          case 'videos':
            matches = mimeType.includes('video');
            break;
          case 'audio':
            matches = mimeType.includes('audio');
            break;
          case 'archives':
            matches = mimeType.includes('zip') || mimeType.includes('rar') ||
              mimeType.includes('tar') || mimeType.includes('7z') ||
              mimeType.includes('compressed');
            break;
          case 'code':
            matches = mimeType.includes('javascript') || mimeType.includes('python') ||
              mimeType.includes('java') || mimeType.includes('html') ||
              mimeType.includes('css') || mimeType.includes('json') ||
              file.original_name.match(/\.(js|ts|py|java|cpp|c|html|css|json|xml|sql)$/i) !== null;
            break;
        }

        if (!matches) return false;
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const fileDate = new Date(file.created_at);
        const now = new Date();
        const diffTime = now.getTime() - fileDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        switch (filters.dateRange) {
          case 'today':
            if (diffDays > 1) return false;
            break;
          case 'week':
            if (diffDays > 7) return false;
            break;
          case 'month':
            if (diffDays > 30) return false;
            break;
          case 'year':
            if (diffDays > 365) return false;
            break;
        }
      }

      // PII filter
      if (filters.hasPII !== 'all') {
        const hasPII = file.metadata?.pii_detected === true;
        if (filters.hasPII === 'withPII' && !hasPII) return false;
        if (filters.hasPII === 'withoutPII' && hasPII) return false;
      }

      // File type filter
      if (filters.fileType !== 'all') {
        const mimeType = file.mime_type?.toLowerCase() || '';
        const fileName = file.original_name.toLowerCase();
        let matches = false;

        switch (filters.fileType) {
          case 'pdf':
            matches = mimeType.includes('pdf');
            break;
          case 'image':
            matches = mimeType.includes('image');
            break;
          case 'text':
            matches = mimeType.includes('text') || fileName.endsWith('.txt');
            break;
          case 'spreadsheet':
            matches = mimeType.includes('spreadsheet') || mimeType.includes('excel') ||
              fileName.match(/\.(xlsx?|csv)$/i) !== null;
            break;
          case 'presentation':
            matches = mimeType.includes('presentation') || mimeType.includes('powerpoint') ||
              fileName.match(/\.(pptx?|odp)$/i) !== null;
            break;
        }

        if (!matches) return false;
      }

      return true;
    });
  };

  // Get filtered files
  const filteredFiles = applyFilters(files);

  // Calculate storage with proper defaults
  const storageUsed = user?.storage_used || 0;
  const storageQuota = user?.storage_quota || 5368709120; // 5 GB default
  const storagePercentage = storageQuota > 0 ? (storageUsed / storageQuota) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-blue-100">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                FileShare
              </h1>
              <p className="text-sm text-gray-600 font-medium">Welcome, {user?.name || 'User'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">


        {/* Breadcrumb Navigation */}
        {!searchQuery && (
          <div className="bg-white rounded-xl shadow-lg p-5 mb-6 border border-gray-200">
            <Breadcrumb breadcrumb={breadcrumb} onNavigate={handleNavigateToFolder} />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-6 border border-gray-200">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${activeTab === 'files'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
            >
              📁 My Files
            </button>
            <button
              onClick={() => setActiveTab('duplicates')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${activeTab === 'duplicates'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
            >
              <Copy size={18} className="inline mr-2" />
              Duplicates
            </button>
          </div>
        </div>

        {/* Files Tab Content */}
        {activeTab === 'files' && (
          <>
            {/* Actions Bar */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
              <div className="flex flex-col gap-4">
                {/* Search Row */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <form onSubmit={handleSearch} className="flex gap-3 flex-1">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search files and folders..."
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-4 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2 ${showFilters
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      <Filter size={18} />
                      Filters
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-800 hover:to-gray-900 font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      Search
                    </button>
                  </form>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsCreateFolderModalOpen(true)}
                      className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-medium shadow-md hover:shadow-lg transition-all transform hover:scale-105"
                    >
                      <FolderPlus size={18} />
                      New Folder
                    </button>

                    <label className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-md hover:shadow-lg transition-all transform hover:scale-105 cursor-pointer">
                      <Upload size={18} />
                      {isUploading ? 'Uploading...' : 'Upload File'}
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <Filter size={16} />
                      Filter Files
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                        <select
                          value={filters.category}
                          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="all">All Categories</option>
                          <option value="documents">📄 Documents</option>
                          <option value="images">🖼️ Images</option>
                          <option value="videos">🎥 Videos</option>
                          <option value="audio">🎵 Audio</option>
                          <option value="archives">📦 Archives</option>
                          <option value="code">💻 Code</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Date Range</label>
                        <select
                          value={filters.dateRange}
                          onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="all">Any Time</option>
                          <option value="today">Today</option>
                          <option value="week">Last 7 Days</option>
                          <option value="month">Last Month</option>
                          <option value="year">Last Year</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">PII Status</label>
                        <select
                          value={filters.hasPII}
                          onChange={(e) => setFilters({ ...filters, hasPII: e.target.value })}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="all">All Files</option>
                          <option value="withPII">⚠️ With PII</option>
                          <option value="withoutPII">✅ Without PII</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">File Type</label>
                        <select
                          value={filters.fileType}
                          onChange={(e) => setFilters({ ...filters, fileType: e.target.value })}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="all">All Types</option>
                          <option value="pdf">PDF</option>
                          <option value="image">Images</option>
                          <option value="text">Text</option>
                          <option value="spreadsheet">Spreadsheets</option>
                          <option value="presentation">Presentations</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => {
                          setFilters({ category: 'all', dateRange: 'all', hasPII: 'all', fileType: 'all' });
                          toast.success('Filters cleared');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                      >
                        Clear Filters
                      </button>
                      <div className="text-sm text-gray-600 flex items-center px-3">
                        {filteredFiles.length !== files.length && (
                          <span className="font-semibold">
                            Showing {filteredFiles.length} of {files.length} files
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Files and Folders List */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FolderOpen size={22} className="text-blue-600" />
                  {searchQuery ? 'Search Results' : currentFolderId ? 'Current Folder' : 'My Files'}
                </h2>
              </div>

              {isLoading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">Loading...</p>
                </div>
              ) : folders.length === 0 && filteredFiles.length === 0 ? (
                <div className="p-12 text-center">
                  <FolderOpen size={64} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-600 mb-2">
                    {searchQuery ? 'No results found' : filteredFiles.length === 0 && files.length > 0 ? 'No files match the filters' : 'This folder is empty'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {searchQuery ? 'Try a different search term' : filteredFiles.length === 0 && files.length > 0 ? 'Try adjusting your filter criteria' : 'Upload files or create folders to get started'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {/* Folders Section */}
                  {folders.length > 0 && !searchQuery && (
                    <div className="p-6">
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FolderIcon size={16} className="text-blue-600" />
                        Folders ({folders.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {folders.map((folder) => (
                          <div
                            key={folder.id}
                            className="group relative border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-white"
                          >
                            <div
                              onClick={() => handleNavigateToFolder(folder.id)}
                              className="flex items-start gap-3"
                            >
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <FolderIcon size={32} className="text-blue-600 flex-shrink-0" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate mb-1" title={folder.name}>
                                  {folder.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(folder.created_at)}
                                </p>
                              </div>
                            </div>

                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFolder(folder.id);
                                }}
                                className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-all"
                                title="Delete folder"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Files Section */}
                  {filteredFiles.length > 0 && (
                    <div className="p-6">
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Download size={16} className="text-blue-600" />
                        Files ({filteredFiles.length})
                        {filteredFiles.length !== files.length && (
                          <span className="text-xs text-gray-500 font-normal ml-2">
                            (filtered from {files.length})
                          </span>
                        )}
                      </h3>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gradient-to-r from-gray-100 to-blue-50">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Name
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Size
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Uploaded
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredFiles.map((file) => (
                              <tr key={file.id} className="hover:bg-blue-50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                      <Download size={18} className="text-blue-600" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-semibold text-gray-900">{file.original_name}</div>
                                      <div className="text-xs text-gray-500">{file.mime_type}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                                  {formatFileSize(file.size)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {formatDate(file.created_at)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <div className="flex gap-2 flex-wrap">
                                    <button
                                      onClick={() => setShareModalFile({ id: file.id, name: file.original_name })}
                                      className="p-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all shadow-sm hover:shadow-md"
                                      title="Share"
                                    >
                                      <Share2 size={18} />
                                    </button>
                                    <button
                                      onClick={() => handleDownload(file)}
                                      className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-sm hover:shadow-md"
                                      title="Download"
                                    >
                                      <Download size={18} />
                                    </button>
                                    {(file.mime_type?.includes('image') || file.mime_type?.includes('pdf')) && (
                                      <button
                                        onClick={() => handleExtractText(file.id, file.original_name)}
                                        className="p-2 text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all shadow-sm hover:shadow-md"
                                        title="Extract Text (OCR)"
                                      >
                                        <ScanText size={18} />
                                      </button>
                                    )}
                                    {(file.mime_type?.includes('text') || file.mime_type?.includes('pdf')) && (
                                      <button
                                        onClick={() => handleSummarize(file.id, file.original_name)}
                                        className="p-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-sm hover:shadow-md"
                                        title="Summarize"
                                      >
                                        <FileText size={18} />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setRecommendationsFileId(file.id);
                                        setRecommendationsFileName(file.original_name);
                                        setShowRecommendations(true);
                                      }}
                                      className="p-2 text-white bg-pink-600 hover:bg-pink-700 rounded-lg transition-all shadow-sm hover:shadow-md"
                                      title="Similar Files"
                                    >
                                      <Sparkles size={18} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(file.id)}
                                      className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all shadow-sm hover:shadow-md"
                                      title="Delete"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Duplicates Tab Content */}
        {activeTab === 'duplicates' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <DuplicatesPanel />
          </div>
        )}
      </main>

      {/* PII Warning Modal */}
      {showPIIModal && piiWarning && piiFile && (
        <PIIWarningModal
          isOpen={showPIIModal}
          onClose={() => setShowPIIModal(false)}
          fileName={piiFile.original_name}
          piiWarning={piiWarning}
          onProceed={handlePIIProceed}
          onCancel={handlePIICancel}
        />
      )}

      {/* OCR Results Modal */}
      {showOCRModal && ocrResult && (
        <OCRResultsModal
          isOpen={showOCRModal}
          onClose={() => setShowOCRModal(false)}
          fileName={ocrFileName}
          result={ocrResult}
        />
      )}

      {/* Summary Modal */}
      {showSummaryModal && summaryResult && (
        <SummaryModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          fileName={summaryFileName}
          fileId={summaryFileId}
          initialSummary={summaryResult}
        />
      )}

      {/* Recommendations Panel */}
      <RecommendationsPanel
        fileId={recommendationsFileId}
        fileName={recommendationsFileName}
        isOpen={showRecommendations}
        onClose={() => setShowRecommendations(false)}
        onDownload={(file) => handleDownload(file as File)}
        onShare={(file) => setShareModalFile({ id: file.id, name: file.original_name })}
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onSubmit={handleCreateFolder}
      />

      {/* Share Modal */}
      {shareModalFile && (
        <ShareModal
          isOpen={true}
          onClose={() => setShareModalFile(null)}
          fileId={shareModalFile.id}
          fileName={shareModalFile.name}
        />
      )}
    </div>
  );
};

export default Dashboard;
