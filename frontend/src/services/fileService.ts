import api from './api';
import { File, PaginatedResponse } from '../types';

export const fileService = {
  async uploadFile(file: File, folderId?: string): Promise<File> {
    const formData = new FormData();
    formData.append('file', file as any);
    if (folderId) {
      formData.append('folderId', folderId);
    }

    const response = await api.post<{ data: File }>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  async getFiles(
    folderId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<File>> {
    const params: any = { page, limit };
    if (folderId) {
      params.folderId = folderId;
    }

    const response = await api.get<{ data: PaginatedResponse<File> }>('/files', {
      params,
    });
    return response.data.data;
  },

  async searchFiles(query: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<File>> {
    const response = await api.get<{ data: PaginatedResponse<File> }>('/files/search', {
      params: { q: query, page, limit },
    });
    return response.data.data;
  },

  async getFile(id: string): Promise<File> {
    const response = await api.get<{ data: File }>(`/files/${id}`);
    return response.data.data;
  },

  async downloadFile(id: string, filename: string): Promise<void> {
    const response = await api.get(`/files/${id}/download`, {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async deleteFile(id: string): Promise<void> {
    await api.delete(`/files/${id}`);
  },

  async renameFile(id: string, name: string): Promise<File> {
    const response = await api.put<{ data: File }>(`/files/${id}/rename`, { name });
    return response.data.data;
  },
};
