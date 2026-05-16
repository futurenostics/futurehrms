import type { S3Client } from '@aws-sdk/client-s3';

export interface StorageClient {
  /** Raw AWS SDK client — for advanced operations not on this interface yet. */
  raw: S3Client;
  /** Bucket the client is bound to (set per StorageService instance, not per client). */
  region: string;
  /** True when running against MinIO (path-style URLs, no signature region check). */
  forcePathStyle: boolean;
}
