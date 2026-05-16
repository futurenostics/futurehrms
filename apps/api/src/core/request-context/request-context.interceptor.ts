import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { RequestContextService } from './request-context.service';

/**
 * Wraps each request in an AsyncLocalStorage scope so any service called
 * during the request can read the actor, IP, user-agent, and correlation
 * ID without threading them through arguments. Set up before guards run.
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly context: RequestContextService) {}

  intercept(executionContext: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = executionContext.switchToHttp().getRequest<Request>();
    const correlationId = (req.headers['x-correlation-id'] as string | undefined) ?? randomUUID();

    return new Observable((subscriber) => {
      this.context.run(
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          correlationId,
        },
        () => {
          next.handle().subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        },
      );
    });
  }
}
