import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app.config';

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
  app.setGlobalPrefix('api', { exclude: ['health'] });

  await app.listen(config.env.PORT);
  logger.log(`API listening on http://localhost:${config.env.PORT}`);
  logger.log(`Health check: http://localhost:${config.env.PORT}/health`);
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap API:', err);
  process.exit(1);
});
