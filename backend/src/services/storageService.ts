import supabase from '../config/supabase';
import fs from 'fs';
import path from 'path';
import { generateUniqueFilename } from '../utils/helpers';

const BUCKET_NAME = 'uploads';

export class StorageService {
  /**
   * Upload a file to Supabase Storage
   */
  static async uploadFile(
    file: Express.Multer.File,
    userId: string
  ): Promise<{ path: string; url: string }> {
    try {
      // Generate unique filename
      const uniqueFilename = generateUniqueFilename(file.originalname);
      const filePath = `${userId}/${uniqueFilename}`;

      // Read file buffer
      const fileBuffer = fs.readFileSync(file.path);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileBuffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      // Get public URL (for private bucket, this won't work directly - we'll use signed URLs)
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      // Clean up local temporary file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return {
        path: filePath,
        url: urlData.publicUrl,
      };
    } catch (error) {
      // Clean up local file on error
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  /**
   * Download a file from Supabase Storage
   */
  static async downloadFile(filePath: string): Promise<Buffer> {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (error) {
      throw new Error(`Supabase download error: ${error.message}`);
    }

    // Convert Blob to Buffer
    const buffer = Buffer.from(await data.arrayBuffer());
    return buffer;
  }

  /**
   * Delete a file from Supabase Storage
   */
  static async deleteFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }
  }

  /**
   * Get a signed URL for temporary access to a file
   */
  static async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Supabase signed URL error: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * List files for a user
   */
  static async listFiles(userId: string): Promise<any[]> {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(userId);

    if (error) {
      throw new Error(`Supabase list error: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Move/rename a file
   */
  static async moveFile(oldPath: string, newPath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .move(oldPath, newPath);

    if (error) {
      throw new Error(`Supabase move error: ${error.message}`);
    }
  }

  /**
   * Check if bucket exists and create if needed
   */
  static async ensureBucketExists(): Promise<void> {
    const { data: buckets } = await supabase.storage.listBuckets();
    
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 104857600, // 100MB
      });

      if (error) {
        console.error('Error creating bucket:', error);
      }
    }
  }
}

export default StorageService;
