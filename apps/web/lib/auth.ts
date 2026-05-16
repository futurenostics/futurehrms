/**
 * Client-side auth helpers — login, logout, /me.
 *
 * Persistence model: access token in memory (cleared on hard reload), refresh
 * token in HttpOnly cookie set by the API. On hard reload, the app calls
 * /auth/refresh to mint a new access token from the cookie.
 */
import {
  authUserSchema,
  loginInputSchema,
  loginResponseSchema,
  type AuthUser,
  type LoginInput,
} from '@futurenostics/types';
import { apiFetch, setAccessToken } from './api-client';

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
    if ((err as { status?: number }).status === 401) {
      return null;
    }
    throw err;
  }
}
