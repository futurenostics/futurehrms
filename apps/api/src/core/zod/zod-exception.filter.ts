import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';

/**
 * Global filter that converts a thrown `ZodError` into a 400 Bad
 * Request with a structured body, instead of letting Nest's default
 * filter turn it into a generic 500 Internal Server Error.
 *
 * Controllers across the API parse request bodies inline with
 * `schema.parse(body)`. Without this filter, every validation failure
 * (empty required field, regex mismatch, etc.) surfaces as a 500 and
 * masks the actual cause from the user — see the reminder-rules
 * create flow as the canonical example.
 *
 * The response body keeps the shape Next-app `apiFetch` expects:
 *   { message: <first issue formatted>, issues: [{ path, message }, …] }
 */
@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ZodExceptionFilter.name);

  catch(exception: ZodError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const issues = exception.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
      code: i.code,
    }));
    const first = issues[0];
    const message = first
      ? first.path
        ? `${first.path}: ${first.message}`
        : first.message
      : 'Validation failed';

    this.logger.warn(`Zod validation failed: ${message}`);

    response.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message,
      issues,
    });
  }
}
