/**
 * Client-side auth helpers — login, logout, /me.
 *
 * Persistence model: access token in memory (cleared on hard reload), refresh
 * token in HttpOnly cookie set by the API. On hard reload, the app calls
 * /auth/refresh to mint a new access token from the cookie. Remember-me
 * affects the cookie's Max-Age (7d default vs 30d when checked) and is
 * decided server-side from the rememberMe flag in the login body.
 */
import {
  authUserSchema,
  loginInputSchema,
  loginResponseSchema,
  type AuthUser,
  type LoginInput,
} from '@futurenostics/types';
import { apiFetch, isApiError, setAccessToken } from './api-client';

export async function login(input: LoginInput): Promise<AuthUser> {
  const body = loginInputSchema.parse(input);
  const data = await apiFetch<unknown>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const parsed = loginResponseSchema.parse(data);
  setAccessToken(parsed.accessToken);
  return parsed.user;
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {
    // ignore — best-effort
  });
  setAccessToken(null);
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const data = await apiFetch<unknown>('/api/auth/me');
    return authUserSchema.parse(data);
  } catch (err) {
    if (isApiError(err) && err.status === 401) {
      return null;
    }
    throw err;
  }
}

/* ---------- Error classification for the login form ---------- */

export type LoginErrorKind =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'SERVER';

export interface LoginError {
  kind: LoginErrorKind;
  message: string;
  /** When the user can retry — present for ACCOUNT_LOCKED and RATE_LIMITED. */
  retryAt?: Date;
}

/**
 * Convert any thrown error from `login()` into a typed shape the form
 * can branch on. Avoids leaking which field is wrong on credential
 * failures (user-enumeration defence).
 */
export function classifyLoginError(err: unknown): LoginError {
  if (!isApiError(err)) {
    return {
      kind: 'NETWORK',
      message: 'Unable to connect. Check your internet and try again.',
    };
  }

  if (err.status === 401) {
    return { kind: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' };
  }

  if (err.status === 403) {
    const retryAt = extractRetryAt(err.body);
    return {
      kind: 'ACCOUNT_LOCKED',
      message: 'Account locked due to too many failed attempts.',
      ...(retryAt ? { retryAt } : {}),
    };
  }

  if (err.status === 429) {
    const retryAt = parseRetryAfterHeader(err.headers) ?? extractRetryAt(err.body);
    return {
      kind: 'RATE_LIMITED',
      message: 'Too many attempts from this connection.',
      ...(retryAt ? { retryAt } : {}),
    };
  }

  return {
    kind: 'SERVER',
    message: 'Something went wrong. Please try again.',
  };
}

function extractRetryAt(body: unknown): Date | undefined {
  if (typeof body !== 'object' || !body) return undefined;
  const value = (body as { retryAt?: unknown }).retryAt;
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseRetryAfterHeader(headers: Headers): Date | undefined {
  const raw = headers.get('retry-after');
  if (!raw) return undefined;
  // Retry-After is either a number of seconds or an HTTP date.
  const asSeconds = Number(raw);
  if (Number.isFinite(asSeconds)) {
    return new Date(Date.now() + asSeconds * 1000);
  }
  const asDate = new Date(raw);
  return Number.isNaN(asDate.getTime()) ? undefined : asDate;
}
