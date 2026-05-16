import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Domain event envelope.
 *
 * Modules emit events instead of calling each other's services directly.
 * The bus is in-process (EventEmitter2) for now; the same interface can
 * be backed by Redis Streams or a real message bus later without changing
 * call sites.
 */
export interface DomainEvent<TPayload = unknown> {
  type: string;
  payload: TPayload;
  occurredAt: Date;
  actorId?: string;
  correlationId?: string;
}

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly emitter: EventEmitter2) {}

  emit<T>(
    type: string,
    payload: T,
    options: { actorId?: string; correlationId?: string } = {},
  ): void {
    const event: DomainEvent<T> = {
      type,
      payload,
      occurredAt: new Date(),
      ...(options.actorId !== undefined ? { actorId: options.actorId } : {}),
      ...(options.correlationId !== undefined ? { correlationId: options.correlationId } : {}),
    };
    this.logger.debug(`event ${type}`, { actorId: event.actorId });
    this.emitter.emit(type, event);
  }

  on<T>(type: string, handler: (event: DomainEvent<T>) => void | Promise<void>): void {
    this.emitter.on(type, handler);
  }
}
