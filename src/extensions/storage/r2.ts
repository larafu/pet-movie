import type {
  StorageConfigs,
  StorageDownloadUploadOptions,
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
} from '.';

/**
 * R2 storage provider configs
 * @docs https://developers.cloudflare.com/r2/
 */
export interface R2Configs extends StorageConfigs {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  endpoint?: string;
  publicDomain?: string;
}

/**
 * R2 storage provider implementation
 * @website https://www.cloudflare.com/products/r2/
 */
export class R2Provider implements StorageProvider {
  readonly name = 'r2';
  configs: R2Configs;

  constructor(configs: R2Configs) {
    this.configs = configs;
  }

  async uploadFile(
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) {
        return {
          success: false,
          error: 'Bucket is required',
          provider: this.name,
        };
      }

      const bodyArray =
        options.body instanceof Buffer
          ? new Uint8Array(options.body)
          : options.body;

      // R2 endpoint format: https://<accountId>.r2.cloudflarestorage.com
      // Use custom endpoint if provided, otherwise use default
      const endpoint =
        this.configs.endpoint ||
        `https://${this.configs.accountId}.r2.cloudflarestorage.com`;
      const url = `${endpoint}/${uploadBucket}/${options.key}`;

      const { AwsClient } = await import('aws4fetch');

      // Polyfill crypto for Node.js environment (aws4fetch requires Web Crypto API)
      if (typeof crypto === 'undefined') {
        const nodeCrypto = await import('crypto');
        (globalThis as any).crypto = nodeCrypto.webcrypto;
      }

      // R2 uses "auto" as region for S3 API compatibility
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const headers: Record<string, string> = {
        'Content-Type': options.contentType || 'application/octet-stream',
        'Content-Disposition': options.disposition || 'inline',
        'Content-Length': bodyArray.length.toString(),
      };

      const request = new Request(url, {
        method: 'PUT',
        headers,
        body: bodyArray as any,
      });

      const response = await client.fetch(request);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ R2 Upload Error:');
        console.error(`   Status: ${response.status} ${response.statusText}`);
        console.error(`   URL: ${url}`);
        console.error(`   Response: ${errorBody}`);

        return {
          success: false,
          error: `Upload failed (${response.status}): ${response.statusText} - ${errorBody}`,
          provider: this.name,
        };
      }

      const publicUrl = this.configs.publicDomain
        ? `${this.configs.publicDomain}/${options.key}`
        : url;

      return {
        success: true,
        location: url,
        bucket: uploadBucket,
        key: options.key,
        filename: options.key.split('/').pop(),
        url: publicUrl,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  /**
   * 生成预签名上传 URL，允许前端直接上传到 R2
   * @param key 文件存储路径
   * @param contentType 文件类型
   * @param expiresIn URL 有效期（秒），默认 3600 秒
   */
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<{ url: string; publicUrl: string }> {
    const { AwsClient } = await import('aws4fetch');

    // Polyfill crypto for Node.js environment
    if (typeof crypto === 'undefined') {
      const nodeCrypto = await import('crypto');
      (globalThis as any).crypto = nodeCrypto.webcrypto;
    }

    const endpoint =
      this.configs.endpoint ||
      `https://${this.configs.accountId}.r2.cloudflarestorage.com`;
    const url = `${endpoint}/${this.configs.bucket}/${key}`;

    const client = new AwsClient({
      accessKeyId: this.configs.accessKeyId,
      secretAccessKey: this.configs.secretAccessKey,
      region: this.configs.region || 'auto',
    });

    // 生成带签名的 URL
    const signedRequest = await client.sign(
      new Request(url, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
      }),
      {
        aws: { signQuery: true },
      }
    );

    const publicUrl = this.configs.publicDomain
      ? `${this.configs.publicDomain}/${key}`
      : url;

    return {
      url: signedRequest.url,
      publicUrl,
    };
  }

  async downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const response = await fetch(options.url);
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error! status: ${response.status}`,
          provider: this.name,
        };
      }

      if (!response.body) {
        return {
          success: false,
          error: 'No body in response',
          provider: this.name,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

      return this.uploadFile({
        body,
        key: options.key,
        bucket: options.bucket,
        contentType: options.contentType,
        disposition: options.disposition,
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }
}

/**
 * Create R2 provider with configs
 */
export function createR2Provider(configs: R2Configs): R2Provider {
  return new R2Provider(configs);
}
