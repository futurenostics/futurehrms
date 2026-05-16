import { Global, Module, type OnModuleDestroy } from '@nestjs/common';
import type IORedis from 'ioredis';
import { AppConfigService } from '../../config/app.config';
import { buildBullConnection } from './bullmq.config';

/**
 * BullMQ scaffolding.
 *
 * Phase 0 boots a single shared IORedis connection and exposes it as
 * `BULL_REDIS_CONNECTION`. Modules that need a queue inject the
 * connection and instantiate `new Queue(...)` themselves — keeping
 * the dependency surface small until enough modules are wiring queues
 * that adopting `@nestjs/bullmq` would actually pay off.
 */
export const BULL_REDIS_CONNECTION = Symbol('BULL_REDIS_CONNECTION');

@Global()
@Module({
  providers: [
    {
      provide: BULL_REDIS_CONNECTION,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): IORedis => buildBullConnection(config.env.REDIS_URL),
    },
  ],
  exports: [BULL_REDIS_CONNECTION],
})
export class SchedulerModule implements OnModuleDestroy {
  constructor() {}

  onModuleDestroy(): void {
    // Connections held by each module's queues are disconnected by BullMQ.
  }
}
