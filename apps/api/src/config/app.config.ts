import { Injectable } from '@nestjs/common';
import { parseEnv, type AppEnv } from './env.schema';

/**
 * Typed wrapper around the validated environment.
 *
 * Prefer injecting `AppConfigService` over reading `process.env` directly —
 * the typed accessors keep the surface area small and make missing config
 * a compile-time problem instead of a runtime one.
 */
@Injectable()
export class AppConfigService {
  readonly env: AppEnv;

  constructor() {
    this.env = parseEnv(process.env);
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  get isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }
}
