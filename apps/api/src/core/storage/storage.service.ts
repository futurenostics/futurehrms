import { Injectable } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createStorageClient, type StorageClient } from '@futurenostics/storage';
import { AppConfigService } from '../../config/app.config';

/**
 * Domain-level wrapper over the S3-compatible client.
 *
 * Consumers (documents module, payslip exporter, payroll CSV writer)
 * call `putObject` / `getSignedDownloadUrl` here instead of using the
 * raw AWS SDK. Keeps the import surface small and lets us swap providers
 * (MinIO ↔ S3) without rewriting call sites.
 */
@Injectable()
export class StorageService {
  private readonly client: StorageClient;
  private readonly documentsBucket: string;
  private readonly templatesBucket: string;

  constructor(config: AppConfigService) {
    const env = config.env;
    this.client = createStorageClient({
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    });
    this.documentsBucket = env.DOCUMENTS_BUCKET;
    this.templatesBucket = env.TEMPLATES_BUCKET;
  }

  async putObject(opts: {
    bucket: 'documents' | 'templates';
    key: string;
    body: Buffer | Uint8Array | string;
    contentType?: string;
  }): Promise<void> {
    await this.client.raw.send(
      new PutObjectCommand({
        Bucket: this.resolveBucket(opts.bucket),
        Key: opts.key,
        Body: opts.body,
        ContentType: opts.contentType,
      }),
    );
  }

  async deleteObject(opts: { bucket: 'documents' | 'templates'; key: string }): Promise<void> {
    await this.client.raw.send(
      new DeleteObjectCommand({
        Bucket: this.resolveBucket(opts.bucket),
        Key: opts.key,
      }),
    );
  }

  async getSignedDownloadUrl(opts: {
    bucket: 'documents' | 'templates';
    key: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.resolveBucket(opts.bucket),
      Key: opts.key,
    });
    return getSignedUrl(this.client.raw, command, {
      expiresIn: opts.expiresInSeconds ?? 60 * 15,
    });
  }

  private resolveBucket(name: 'documents' | 'templates'): string {
    return name === 'documents' ? this.documentsBucket : this.templatesBucket;
  }
}
