import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { shareService } from '../services/shareService';
import toast from 'react-hot-toast';
import { Download, Lock, FileText, Calendar, User, Eye, EyeOff } from 'lucide-react';

const PublicShare = () => {
  const { token } = useParams<{ token: string }>();
  const [file, setFile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(false); // Track if file is password-protected

  useEffect(() => {
    if (token) {
      loadFile();
    }
  }, [token]);

  const loadFile = async (pwd?: string) => {
    try {
      setIsLoading(true);
      setError('');

      const data = await shareService.getPublicShare(token!, pwd);
      setFile(data);
      setRequiresPassword(false);
      // If we successfully loaded with a password, remember it's password-protected
      if (pwd) {
        setHasPassword(true);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to load file';

      if (errorMsg === 'Password required') {
        setRequiresPassword(true);
        setHasPassword(true); // File is password-protected
        setError('');
      } else if (errorMsg === 'Invalid password') {
        setRequiresPassword(true);
        setHasPassword(true); // File is password-protected
        setError('Invalid password. Please try again.');
      } else {
        setError(errorMsg);
        setRequiresPassword(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      loadFile(password);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      // Send password if the file is password-protected (not if we still need to ask for it)
      await shareService.downloadSharedFile(
        token!,
        hasPassword ? password : undefined,
        file.original_name
      );
      toast.success('Download started!');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Download failed';
      toast.error(errorMsg);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <h1 className="text-2xl font-bold">FileShare</h1>
          <p className="text-blue-100 mt-1">Secure File Sharing</p>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading file...</p>
            </div>
          ) : error && !requiresPassword ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <FileText size={32} className="text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : requiresPassword && !file ? (
            <div className="py-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Lock size={32} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Required</h2>
                <p className="text-gray-600">This file is protected. Please enter the password.</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Unlock
                </button>
              </form>
            </div>
          ) : file ? (
            <div className="py-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <FileText size={32} className="text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{file.original_name}</h2>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-2">
                    <FileText size={16} />
                    File Type
                  </span>
                  <span className="font-medium text-gray-900">{file.mime_type || 'Unknown'}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Download size={16} />
                    File Size
                  </span>
                  <span className="font-medium text-gray-900">{formatFileSize(file.size)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-2">
                    <User size={16} />
                    Shared By
                  </span>
                  <span className="font-medium text-gray-900">{file.owner_name}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Calendar size={16} />
                    Uploaded
                  </span>
                  <span className="font-medium text-gray-900">{formatDate(file.created_at)}</span>
                </div>
              </div>

              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                <Download size={20} />
                {isDownloading ? 'Downloading...' : 'Download File'}
              </button>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 text-center border-t">
          <p className="text-sm text-gray-600">
            Powered by <span className="font-semibold text-blue-600">FileShare</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicShare;
