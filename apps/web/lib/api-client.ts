/**
 * Browser-side API client.
 *
 * Holds the access token in memory (no localStorage — XSS-safe by default)
 * and lets the HttpOnly refresh cookie do the persistence work. On a 401,
 * the client transparently calls /auth/refresh once before retrying.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

let accessToken: string | null = null;
let refreshing: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export interface ApiError extends Error {
  status: number;
  body: unknown;
}

function makeError(status: number, body: unknown, message: string): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  err.body = body;
  return err;
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
  if (res.status === 401 && accessToken) {
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
    throw makeError(res.status, body, message);
  }
  return body as T;
}
