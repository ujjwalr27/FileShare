import api from './api';
import { Folder, PaginatedResponse, File } from '../types';

export const folderService = {
  async createFolder(name: string, parentId?: string): Promise<Folder> {
    const response = await api.post<{ data: Folder }>('/folders', {
      name,
      parentId,
    });
    return response.data.data;
  },

  async getFolders(parentId?: string, page: number = 1, limit: number = 50): Promise<PaginatedResponse<Folder>> {
    const params: any = { page, limit };
    if (parentId) {
      params.parentId = parentId;
    }

    const response = await api.get<{ data: PaginatedResponse<Folder> }>('/folders', {
      params,
    });
    return response.data.data;
  },

  async getFolder(id: string): Promise<Folder> {
    const response = await api.get<{ data: Folder }>(`/folders/${id}`);
    return response.data.data;
  },

  async getFolderContents(id: string): Promise<{ folders: Folder[]; files: File[] }> {
    const response = await api.get<{ data: { folders: Folder[]; files: File[] } }>(
      `/folders/${id}/contents`
    );
    return response.data.data;
  },

  async getRootContents(): Promise<{ folders: Folder[]; files: File[] }> {
    const response = await api.get<{ data: { folders: Folder[]; files: File[] } }>(
      `/folders/root/contents`
    );
    return response.data.data;
  },

  async getFolderBreadcrumb(id: string): Promise<Folder[]> {
    const response = await api.get<{ data: Folder[] }>(`/folders/${id}/breadcrumb`);
    return response.data.data;
  },

  async renameFolder(id: string, name: string): Promise<Folder> {
    const response = await api.put<{ data: Folder }>(`/folders/${id}/rename`, { name });
    return response.data.data;
  },

  async moveFolder(id: string, parentId?: string): Promise<Folder> {
    const response = await api.put<{ data: Folder }>(`/folders/${id}/move`, { parentId });
    return response.data.data;
  },

  async deleteFolder(id: string): Promise<void> {
    await api.delete(`/folders/${id}`);
  },
};
