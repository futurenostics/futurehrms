import 'reflect-metadata';
// Pre-warm iconv-lite's lazy encoding loaders. body-parser pulls
// iconv-lite to decode request bodies and lazily `require`s
// `encodings/index.js` the first time a non-UTF8 charset is seen
// (or, on some macOS sandbox setups, the first time it's hit at all).
// If the dev environment's filesystem sandbox state drifts between
// "started" and "first POST" — which happened repeatedly during
// Phase 2 dev when a parent watcher's CWD got invalidated — that
// lazy require throws EPERM and every body-bearing request dies
// with a cryptic 400. Loading the encodings module eagerly here
// resolves the file at boot, when the sandbox is still warm, and
// the module cache holds it for the lifetime of the process.
//
// Guarded with try/catch so that a hoisting layout where
// iconv-lite isn't directly resolvable (pnpm strict mode) doesn't
// crash boot — body-parser will fall back to its own lazy require
// when the time comes.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('iconv-lite/encodings');
} catch {
  /* hoisting-dependent — fine to skip when not directly resolvable. */
}
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app.config';
import { ZodExceptionFilter } from './core/zod/zod-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.env.APP_URL,
    credentials: true,
  });
  // Body validation is handled per-controller with zod schemas from
  // @futurenostics/types — no class-validator dependency required.
  // The global ZodExceptionFilter maps thrown ZodErrors to 400 with a
  // structured body so validation failures don't surface as 500.
  app.useGlobalFilters(new ZodExceptionFilter());
  app.setGlobalPrefix('api', { exclude: ['health'] });

  await app.listen(config.env.PORT);
  logger.log(`API listening on http://localhost:${config.env.PORT}`);
  logger.log(`Health check: http://localhost:${config.env.PORT}/health`);
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap API:', err);
  process.exit(1);
});
