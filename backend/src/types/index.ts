import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  storage_quota: number;
  storage_used: number;
  is_active: boolean;
  email_verified: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  storage_quota: number;
  storage_used: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Folder {
  id: string;
  user_id: string;
  parent_id?: string;
  name: string;
  path: string;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
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
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
  metadata?: any;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version: number;
  path: string;
  size: number;
  hash?: string;
  created_by?: string;
  created_at: Date;
}

export interface Share {
  id: string;
  file_id?: string;
  folder_id?: string;
  user_id: string;
  token: string;
  password_hash?: string;
  expires_at?: Date;
  max_downloads?: number;
  download_count: number;
  permissions: SharePermissions;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SharePermissions {
  view: boolean;
  download: boolean;
  edit: boolean;
}

export interface Permission {
  id: string;
  file_id?: string;
  folder_id?: string;
  owner_id: string;
  shared_with_id: string;
  permission_type: 'view' | 'edit' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: 'file' | 'folder' | 'share' | 'user';
  resource_id?: string;
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface FileMetadata {
  id: string;
  file_id: string;
  tags?: string[];
  category?: string;
  summary?: string;
  detected_objects?: string[];
  language?: string;
  sentiment?: string;
  confidence_score?: number;
  processed_at: Date;
}

export interface AuthRequest extends Request {
  user?: UserResponse;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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
