/**
 * Browser-side API client.
 *
 * Holds the access token in memory (no localStorage — XSS-safe by default)
 * and lets the HttpOnly refresh cookie do the persistence work. On a 401,
 * the client transparently calls /auth/refresh once before retrying. The
 * refresh path also fires when there's no in-memory token at all — that
 * covers the hard-reload case where the access token vanishes but the
 * refresh cookie is still valid.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

let accessToken: string | null = null;
let refreshing: Promise<string | null> | null = null;
/** Skip the refresh-on-401 dance for the refresh endpoint itself. */
const AUTH_PATHS_NO_REFRESH = new Set<string>([
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/login',
]);

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export interface ApiError extends Error {
  status: number;
  body: unknown;
  headers: Headers;
}

function makeError(status: number, body: unknown, message: string, headers: Headers): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  err.body = body;
  err.headers = headers;
  return err;
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof Error && typeof (err as ApiError).status === 'number';
}

async function refreshToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        accessToken = null;
        // If the cookie is present but the refresh token is revoked or
        // expired on the server, the middleware will keep bouncing
        // /login → /dashboard because it only checks for cookie
        // presence. Tell the server to clear the cookie so the loop
        // ends and the user lands on /login as expected.
        if (res.status === 401) {
          await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include',
          }).catch(() => undefined);
        }
        return null;
      }
      const data = (await res.json()) as { accessToken: string };
      accessToken = data.accessToken;
      return accessToken;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const headers = new Headers(init.headers);
  if (!headers.has('content-type') && init.body) {
    headers.set('content-type', 'application/json');
  }
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  const exec = async (token: string | null): Promise<Response> => {
    const h = new Headers(headers);
    if (token) {
      h.set('authorization', `Bearer ${token}`);
    } else {
      h.delete('authorization');
    }
    return fetch(url, { ...init, headers: h, credentials: 'include' });
  };

  let res = await exec(accessToken);
  // Refresh on 401 regardless of whether we had a token — this covers
  // the hard-reload case where accessToken is null but the refresh
  // cookie is still valid. The auth endpoints opt out of the retry to
  // avoid infinite recursion (refresh failing → refresh again → …).
  const isAuthEndpoint = AUTH_PATHS_NO_REFRESH.has(path);
  if (res.status === 401 && !isAuthEndpoint) {
    const newToken = await refreshToken();
    if (newToken) {
      res = await exec(newToken);
    }
  }

  const contentType = res.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json')
    ? ((await res.json()) as unknown)
    : await res.text();

  if (!res.ok) {
    const message =
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message?: unknown }).message ?? `Request failed (${res.status})`)
        : `Request failed (${res.status})`;
    throw makeError(res.status, body, message, res.headers);
  }
  return body as T;
}
