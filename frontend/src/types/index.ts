export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  storage_quota: number;
  storage_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface File {
  id: string;
  user_id: string;
  folder_id?: string;
  name: string;
  original_name: string;
  path: string;
  size: number;
  mime_type?: string;
  extension?: string;
  hash?: string;
  version: number;
  is_deleted: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  pii_warning?: any;
  file?: File; // For nested file references
}

export interface Folder {
  id: string;
  user_id: string;
  parent_id?: string;
  name: string;
  path: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
