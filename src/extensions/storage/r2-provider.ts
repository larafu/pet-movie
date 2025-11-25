/**
 * Cloudflare R2 Storage Provider
 * Uses S3-compatible API
 */

import { AwsClient } from 'aws4fetch';
import type {
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
  R2Config,
} from './types';

export class R2StorageProvider implements StorageProvider {
  private client: AwsClient;
  private bucketName: string;
  private publicDomain: string;
  private accountId: string;

  constructor(config: R2Config) {
    this.accountId = config.accountId;
    this.bucketName = config.bucketName;
    this.publicDomain = config.publicDomain;

    // Create AWS-compatible client for R2
    this.client = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: 'auto', // R2 uses 'auto' region
      service: 's3',
    });
  }

  /**
   * Get R2 endpoint URL
   */
  private getEndpoint(): string {
    return `https://${this.accountId}.r2.cloudflarestorage.com`;
  }

  /**
   * Upload file to R2
   */
  async upload(options: StorageUploadOptions): Promise<StorageUploadResult> {
    const { key, data, contentType } = options;

    const url = `${this.getEndpoint()}/${this.bucketName}/${key}`;

    // Convert data to proper format
    let body: ArrayBuffer | Blob;
    if (data instanceof Buffer) {
      // 使用 Uint8Array 复制数据以确保获得纯 ArrayBuffer
      const uint8Array = new Uint8Array(data);
      body = uint8Array.buffer;
    } else if (data instanceof Blob) {
      body = data;
    } else {
      // ReadableStream - need to convert to buffer
      const reader = (data as ReadableStream).getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      body = result.buffer;
    }

    const headers: Record<string, string> = {
      'Content-Type': contentType || 'application/octet-stream',
    };

    // Add metadata as x-amz-meta- headers
    if (options.metadata) {
      for (const [k, v] of Object.entries(options.metadata)) {
        headers[`x-amz-meta-${k}`] = v;
      }
    }

    const signedRequest = await this.client.sign(url, {
      method: 'PUT',
      headers,
      body,
    });

    const response = await fetch(signedRequest);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `R2 upload failed (${response.status}): ${errorText}`
      );
    }

    return {
      url: this.getPublicUrl(key),
      key,
    };
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    // Remove leading slash if present
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    return `${this.publicDomain}/${cleanKey}`;
  }

  /**
   * Delete file from R2
   */
  async delete(key: string): Promise<void> {
    const url = `${this.getEndpoint()}/${this.bucketName}/${key}`;

    const signedRequest = await this.client.sign(url, {
      method: 'DELETE',
    });

    const response = await fetch(signedRequest);

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new Error(
        `R2 delete failed (${response.status}): ${errorText}`
      );
    }
  }

  /**
   * Check if file exists
   */
  async exists(key: string): Promise<boolean> {
    const url = `${this.getEndpoint()}/${this.bucketName}/${key}`;

    const signedRequest = await this.client.sign(url, {
      method: 'HEAD',
    });

    const response = await fetch(signedRequest);

    return response.ok;
  }
}

/**
 * Create R2 storage provider from database config
 */
export async function createR2StorageProvider(): Promise<R2StorageProvider> {
  // Import here to avoid circular dependencies
  const { db } = await import('@/core/db');
  const { config: configTable } = await import('@/config/db/schema');
  const { eq } = await import('drizzle-orm');

  const database = db();

  // Fetch all R2 configs in parallel
  const [accountIdRow, accessKeyRow, secretKeyRow, bucketRow, domainRow] =
    await Promise.all([
      database
        .select()
        .from(configTable)
        .where(eq(configTable.name, 'r2_account_id'))
        .limit(1),
      database
        .select()
        .from(configTable)
        .where(eq(configTable.name, 'r2_access_key'))
        .limit(1),
      database
        .select()
        .from(configTable)
        .where(eq(configTable.name, 'r2_secret_key'))
        .limit(1),
      database
        .select()
        .from(configTable)
        .where(eq(configTable.name, 'r2_bucket_name'))
        .limit(1),
      database
        .select()
        .from(configTable)
        .where(eq(configTable.name, 'r2_domain'))
        .limit(1),
    ]);

  const accountId = accountIdRow[0]?.value;
  const accessKeyId = accessKeyRow[0]?.value;
  const secretAccessKey = secretKeyRow[0]?.value;
  const bucketName = bucketRow[0]?.value;
  const publicDomain = domainRow[0]?.value;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicDomain) {
    throw new Error(
      'R2 storage configuration incomplete. Please configure R2 settings in the admin panel.'
    );
  }

  return new R2StorageProvider({
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicDomain,
  });
}
