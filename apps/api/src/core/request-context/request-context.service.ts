import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request store carrying the authenticated actor, IP, and user-agent.
 *
 * Used by the audit middleware to attribute writes, and by services that
 * need to attach the actor to events. Set by `RequestContextInterceptor`
 * once authentication has resolved the user.
 */
export interface RequestContext {
  actorId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  get(): RequestContext | undefined {
    return this.storage.getStore();
  }

  set(patch: Partial<RequestContext>): void {
    const current = this.storage.getStore();
    if (current) {
      Object.assign(current, patch);
    }
  }
}
