/**
 * Storage Provider Interface
 * Abstraction layer for different storage backends (R2, S3, etc.)
 */

export interface StorageUploadOptions {
  key: string; // File path in bucket
  data: Buffer | ReadableStream | Blob;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageUploadResult {
  url: string; // Public URL of uploaded file
  key: string; // Storage key/path
}

export interface StorageProvider {
  /**
   * Upload file to storage
   */
  upload(options: StorageUploadOptions): Promise<StorageUploadResult>;

  /**
   * Get public URL for a storage key
   */
  getPublicUrl(key: string): string;

  /**
   * Delete file from storage
   */
  delete(key: string): Promise<void>;

  /**
   * Check if file exists
   */
  exists(key: string): Promise<boolean>;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain: string;
}
