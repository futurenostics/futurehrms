/**
 * Playwright globalSetup — one login per test run.
 *
 * The auth controller rate-limits `/api/auth/login` at 20 requests /
 * 15 minutes. Logging in per test would burn through the quota fast
 * on any rerun loop. Instead we log in once here, save the resulting
 * cookie jar + accessToken to a state file, and every test loads
 * that file via `use.storageState` in playwright.config.ts.
 *
 * The refresh cookie is HttpOnly; the api-client refreshes the
 * in-memory access token off it on the first 401, so navigating to
 * a protected page works with just the cookie in place.
 */
import { request as pwRequest } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:4000';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@futurenostics.local';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'ChangeMe!Now123';

export const STORAGE_STATE_PATH = './tests/.auth/admin-state.json';
export const SESSION_META_PATH = './tests/.auth/admin-meta.json';

export default async function globalSetup(): Promise<void> {
  const api = await pwRequest.newContext({ baseURL: API_BASE });
  const res = await api.post('/api/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!res.ok()) {
    throw new Error(`E2E globalSetup login failed: ${res.status()} ${await res.text()}`);
  }
  const { accessToken, user } = (await res.json()) as {
    accessToken: string;
    user: { id: string };
  };

  // Save cookies for browser context reuse.
  await mkdir(dirname(STORAGE_STATE_PATH), { recursive: true });
  await api.storageState({ path: STORAGE_STATE_PATH });

  // Save the access token + user id separately for raw-API test helpers.
  await writeFile(
    SESSION_META_PATH,
    JSON.stringify({ accessToken, userId: user.id }, null, 2),
    'utf-8',
  );

  await api.dispose();
}
