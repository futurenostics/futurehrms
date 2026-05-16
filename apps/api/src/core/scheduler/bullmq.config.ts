import IORedis from 'ioredis';

/**
 * Build an IORedis connection for BullMQ.
 *
 * BullMQ requires `maxRetriesPerRequest: null` and `enableReadyCheck: false`
 * for the connection used by workers and queues — without these flags
 * the client throws on transient hiccups instead of letting BullMQ retry.
 */
export function buildBullConnection(redisUrl: string): IORedis {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
