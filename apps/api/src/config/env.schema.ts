import { z } from 'zod';

/**
 * Process-wide environment validation.
 *
 * Parsed once at boot via `app.config.ts`. Any missing or malformed value
 * crashes the process loudly — the goal is to fail at startup, not at
 * the first request that happens to need the variable.
 */
export const envSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z.coerce.number().int().positive().default(4000),
  TZ: z.string().default('Asia/Karachi'),

  // URLs
  APP_URL: z.string().url(),
  API_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Storage (S3-compatible)
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_REGION: z.string().default('us-east-1'),
  S3_FORCE_PATH_STYLE: z
    .union([z.literal('true'), z.literal('false')])
    .default('true')
    .transform((v) => v === 'true'),
  DOCUMENTS_BUCKET: z.string().default('fn-hrms-documents'),
  TEMPLATES_BUCKET: z.string().default('fn-hrms-template-assets'),

  // Email
  EMAIL_PROVIDER: z.enum(['mailpit', 'smtp', 'resend']).default('mailpit'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMTP_FROM: z.string().default('Futurenostics HRMS <no-reply@futurenostics.local>'),
  RESEND_API_KEY: z.string().optional().default(''),

  // Seed
  SEED_ADMIN_EMAIL: z.string().email().default('admin@futurenostics.local'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('ChangeMe!Now123'),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(input: NodeJS.ProcessEnv): AppEnv {
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const lines = Object.entries(flat.fieldErrors)
      .flatMap(([key, errors]) => (errors ?? []).map((err) => `  - ${key}: ${err}`))
      .join('\n');
    throw new Error(
      `Invalid environment configuration:\n${lines}\n\nSee .env.example for the expected shape.`,
    );
  }
  return parsed.data;
}
