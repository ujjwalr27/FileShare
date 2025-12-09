import { useState, useEffect } from 'react';
import { X, Copy, Link2, Lock, Calendar, Download, Eye, EyeOff, Trash2 } from 'lucide-react';
import { shareService, Share } from '../services/shareService';
import toast from 'react-hot-toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
}

const ShareModal = ({ isOpen, onClose, fileId, fileName }: ShareModalProps) => {
  const [shares, setShares] = useState<Share[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState('');
  const [maxDownloads, setMaxDownloads] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadShares();
    }
  }, [isOpen, fileId]);

  const loadShares = async () => {
    try {
      setIsLoading(true);
      const data = await shareService.getFileShares(fileId);
      setShares(data);
    } catch (error) {
      toast.error('Failed to load shares');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateShare = async () => {
    try {
      setIsCreating(true);

      let expiresAt: string | undefined;
      if (expiresIn) {
        const now = new Date();
        const hours = parseInt(expiresIn);
        if (isNaN(hours) || hours < 1) {
          toast.error('Invalid expiration hours');
          return;
        }
        now.setHours(now.getHours() + hours);
        expiresAt = now.toISOString();
      }

      const maxDl = maxDownloads ? parseInt(maxDownloads) : undefined;
      if (maxDl !== undefined && (isNaN(maxDl) || maxDl < 1)) {
        toast.error('Invalid max downloads');
        return;
      }

      await shareService.createShare({
        fileId,
        password: password || undefined,
        expiresAt,
        maxDownloads: maxDl,
      });

      toast.success('Share link created!');
      setPassword('');
      setExpiresIn('');
      setMaxDownloads('');
      loadShares();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create share');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = (shareUrl: string) => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleDeleteShare = async (shareId: string) => {
    if (!confirm('Delete this share link?')) return;

    try {
      await shareService.deleteShare(shareId);
      toast.success('Share deleted');
      loadShares();
    } catch (error) {
      toast.error('Failed to delete share');
    }
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Link2 size={24} className="text-blue-600" />
              Share File
            </h2>
            <p className="text-sm text-gray-600 mt-1 font-medium">{fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-white rounded-full p-2 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Create Share Section */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 mb-6 border-2 border-blue-100 shadow-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Link2 size={18} className="text-white" />
              </div>
              Create New Share Link
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Lock size={14} />
                  Password (optional)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave empty for no password"
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded transition-all"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <Calendar size={14} />
                    Expires in (hours)
                  </label>
                  <input
                    type="number"
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    placeholder="Never"
                    min="1"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <Download size={14} />
                    Max downloads
                  </label>
                  <input
                    type="number"
                    value={maxDownloads}
                    onChange={(e) => setMaxDownloads(e.target.value)}
                    placeholder="Unlimited"
                    min="1"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateShare}
                disabled={isCreating}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Link2 size={20} />
                {isCreating ? 'Creating...' : 'Create Share Link'}
              </button>
            </div>
          </div>

          {/* Existing Shares */}
          <div>
            <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
              <Link2 size={18} className="text-blue-600" />
              Active Share Links ({shares.length})
            </h3>

            {isLoading ? (
              <div className="text-center py-8 text-gray-600">Loading...</div>
            ) : shares.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
                <Link2 size={48} className="mx-auto mb-2 text-gray-400" />
                <p className="font-medium">No share links yet</p>
                <p className="text-sm">Create one above to start sharing!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className={`border-2 rounded-lg p-4 transition-all ${
                      !share.is_active 
                        ? 'bg-gray-50 opacity-60 border-gray-300' 
                        : 'bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Share URL with prominent display */}
                        <div className="mb-3">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 block">
                            🔗 Share Link
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={share.share_url}
                              readOnly
                              className="flex-1 px-4 py-3 text-sm border-2 border-blue-300 rounded-lg bg-white font-mono text-blue-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 select-all"
                              onClick={(e) => e.currentTarget.select()}
                            />
                            <button
                              onClick={() => handleCopyLink(share.share_url)}
                              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm hover:shadow"
                              title="Copy link"
                            >
                              <Copy size={16} />
                              Copy
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                          {share.password_hash && (
                            <span className="flex items-center gap-1">
                              <Lock size={12} />
                              Password protected
                            </span>
                          )}
                          {share.expires_at && (
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              Expires: {formatDate(share.expires_at)}
                            </span>
                          )}
                          {share.max_downloads && (
                            <span className="flex items-center gap-1">
                              <Download size={12} />
                              {share.download_count}/{share.max_downloads} downloads
                            </span>
                          )}
                          {!share.max_downloads && (
                            <span className="flex items-center gap-1">
                              <Download size={12} />
                              {share.download_count} downloads
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          Created: {formatDate(share.created_at)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteShare(share.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete share"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {!share.is_active && (
                      <div className="mt-2 text-xs text-red-600 font-medium">
                        Inactive
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
