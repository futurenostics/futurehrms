/**
 * S3-compatible storage client factory.
 *
 * Works against MinIO in development (path-style URLs, fixed credentials)
 * and AWS S3 in production (virtual-hosted, IAM-style). The consumer
 * (`apps/api/src/core/storage/storage.service.ts`) wraps this with a
 * domain interface for uploading documents, generating signed URLs,
 * and listing objects.
 */
import { S3Client } from '@aws-sdk/client-s3';
import type { StorageClient } from './types';

export interface StorageClientConfig {
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

export function createStorageClient(config: StorageClientConfig): StorageClient {
  const forcePathStyle = config.forcePathStyle ?? false;

  const raw = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle,
  });

  return { raw, region: config.region, forcePathStyle };
}
