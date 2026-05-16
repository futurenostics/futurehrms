import { z } from 'zod';

export const loginInputSchema = z.object({
  email: z.string().email('Enter a valid email').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  /**
   * When true the refresh cookie is set with an extended Max-Age (30d
   * vs the default 7d). The email is also remembered client-side for
   * pre-fill on the next visit — never the password.
   */
  rememberMe: z.boolean().optional().default(false),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

/**
 * Structured error payload returned by the login endpoint for the
 * specific failure modes the UI surfaces differently. Generic 4xx
 * still uses the plain Nest exception shape `{message, statusCode}`.
 */
export const loginErrorSchema = z.object({
  code: z.enum(['INVALID_CREDENTIALS', 'ACCOUNT_LOCKED', 'RATE_LIMITED']),
  message: z.string(),
  /** ISO timestamp the account / IP is unlocked. Present for LOCKED and RATE_LIMITED. */
  retryAt: z.string().datetime().optional(),
});
export type LoginErrorPayload = z.infer<typeof loginErrorSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string().nullable(),
  employeeId: z.string().nullable(),
  permissions: z.array(z.string()),
  roles: z.array(z.string()),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
});
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
