import api from './api';

export interface Share {
  id: string;
  file_id: string;
  user_id: string;
  share_token: string;
  share_url: string;
  password_hash?: string;
  expires_at?: string;
  max_downloads?: number;
  download_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateShareRequest {
  fileId: string;
  password?: string;
  expiresAt?: string;
  maxDownloads?: number;
}

export interface UpdateShareRequest {
  password?: string;
  expiresAt?: string | null;
  maxDownloads?: number | null;
  isActive?: boolean;
}

export const shareService = {
  async createShare(data: CreateShareRequest): Promise<Share> {
    const response = await api.post<{ data: Share }>('/shares', data);
    return response.data.data;
  },

  async getUserShares(): Promise<Share[]> {
    const response = await api.get<{ data: Share[] }>('/shares');
    return response.data.data;
  },

  async getFileShares(fileId: string): Promise<Share[]> {
    const response = await api.get<{ data: Share[] }>(`/shares/file/${fileId}`);
    return response.data.data;
  },

  async updateShare(shareId: string, data: UpdateShareRequest): Promise<Share> {
    const response = await api.put<{ data: Share }>(`/shares/${shareId}`, data);
    return response.data.data;
  },

  async deleteShare(shareId: string): Promise<void> {
    await api.delete(`/shares/${shareId}`);
  },

  async revokeShare(shareId: string): Promise<Share> {
    const response = await api.post<{ data: Share }>(`/shares/${shareId}/revoke`);
    return response.data.data;
  },

  // Public endpoints
  async getPublicShare(token: string, password?: string): Promise<any> {
    const params = password ? { password } : {};
    const response = await api.get<{ data: any }>(`/shares/public/${token}`, { params });
    return response.data.data;
  },

  async downloadSharedFile(token: string, password?: string, filename?: string): Promise<void> {
    const params = password ? { password } : {};
    const response = await api.get(`/shares/public/${token}/download`, {
      params,
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || 'download');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};
