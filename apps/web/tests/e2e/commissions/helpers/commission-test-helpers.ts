/**
 * Helpers for the Phase 2 commission-run e2e suite.
 *
 * The tests hit a running dev stack (API on :4000, web on :3000)
 * and the live dev DB. Each test owns a unique monthKey so reruns
 * don't collide; helpers tear down what they created.
 *
 * Auth pattern: log in via the API once, harvest the Bearer token,
 * push it into localStorage (which is how the web app's api-client
 * reads it) before navigating to a page. Then UI interactions ride
 * on that token via fetch with credentials.
 */
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, request as pwRequest } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:4000';
export const WEB_BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@futurenostics.local';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'ChangeMe!Now123';

export interface AuthSession {
  accessToken: string;
  userId: string;
  api: APIRequestContext;
}

/**
 * Singleton session cache — globalSetup logs in once per run and
 * stashes the access token + user id in `tests/.auth/admin-meta.json`.
 * Test helpers read that file instead of hitting /auth/login (which
 * is throttled at 20 requests / 15 minutes — burns fast on reruns).
 *
 * The shared APIRequestContext re-attaches the refresh cookie from
 * the saved storageState so subsequent /commission-runs calls
 * authenticate automatically.
 */
let _cachedSession: AuthSession | null = null;

const SESSION_META_PATH = path.resolve(__dirname, '../../../.auth/admin-meta.json');
const STORAGE_STATE_PATH = path.resolve(__dirname, '../../../.auth/admin-state.json');

export async function loginAsAdmin(): Promise<AuthSession> {
  if (_cachedSession) return _cachedSession;
  let meta: { accessToken: string; userId: string };
  try {
    const raw = await fs.readFile(SESSION_META_PATH, 'utf-8');
    meta = JSON.parse(raw) as { accessToken: string; userId: string };
  } catch (err) {
    throw new Error(
      `E2E session meta not found at ${SESSION_META_PATH}. ` +
        `Run via 'pnpm test:e2e' so global-setup.ts runs first. (${(err as Error).message})`,
    );
  }
  const api = await pwRequest.newContext({
    baseURL: API_BASE,
    storageState: STORAGE_STATE_PATH,
  });
  _cachedSession = {
    accessToken: meta.accessToken,
    userId: meta.userId,
    api,
  };
  return _cachedSession;
}

/**
 * Authenticate the browser context for UI navigation.
 *
 * The refresh-token rotation logic on /api/auth/refresh means a saved
 * storageState cookie is consumed on first use and becomes invalid for
 * subsequent contexts. To dodge that fragility entirely, we inject a
 * fetch override into the page that:
 *   1. Stamps `Authorization: Bearer <accessToken>` on every /api/ call
 *      so the SPA never needs to hit /refresh.
 *   2. Plants the same cookie that the middleware checks for, so the
 *      Next.js middleware lets the page render server-side.
 *
 * The access token's 15-minute lifetime is plenty for the test suite,
 * and globalSetup re-creates it on every run.
 */
export async function authenticatePage(page: Page, session: AuthSession): Promise<void> {
  // Plant the refresh cookie on both possible host bindings so middleware passes.
  await page.context().addCookies([
    {
      name: 'fn_refresh',
      value: 'e2e-bypass',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    },
  ]);
  // Stamp Authorization header on every /api/* fetch from the page.
  await page.addInitScript((token: string) => {
    const orig = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/api/')) {
        const headers = new Headers(
          init?.headers ?? (input instanceof Request ? input.headers : undefined),
        );
        if (!headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
        return orig(input, { ...init, headers });
      }
      return orig(input, init);
    };
  }, session.accessToken);
}

/**
 * Compute a monthKey that's far enough in the past to not collide with
 * seeded data or the current month. Tests use month_offset to pick
 * e.g. 2025-12 / 2025-11 etc. NOTE: tests that mutate to approved+
 * leave data behind because the state machine doesn't allow
 * approved → draft rewinds. Use {@link uniqueMonthKey} instead for
 * those tests if you need rerun stability.
 */
export function monthKeyOffset(offsetMonthsFromNow: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + offsetMonthsFromNow);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Pick a never-used-before monthKey from a wide far-past window
 * (year 1900 – 2049, ~1800 slots). Reruns minutes apart land on
 * different slots because Date.now() drifts by milliseconds and we
 * mod by 1800. Tests that progress a run to approved/locked rely on
 * this rotation since the state machine doesn't allow approved →
 * draft rewinds — so each run picks a fresh slot.
 *
 * If the slots ever fill up the test will fail loudly with a clear
 * message and you can widen the window.
 */
let _monthKeyCounter = 0;
export function uniqueMonthKey(): string {
  _monthKeyCounter += 1;
  const seed = Date.now() + _monthKeyCounter * 1_000;
  const totalSlots = 12 * 150; // 1900-01 .. 2049-12
  const offset = Math.abs(seed) % totalSlots;
  const month = (offset % 12) + 1;
  const year = 1900 + Math.floor(offset / 12);
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Find-or-create a draft run for `monthKey` via the API.
 *
 * The DB enforces a unique (monthKey) on CommissionRun, so reruns of
 * the same test would otherwise collide on the second invocation. We
 * look up first; if a run exists we walk its state back to `draft`
 * (rejected → draft via reopen, pending_approval → rejected → draft).
 * Approved / locked runs are too sticky to safely rewind; in that case
 * we throw so the test fails loudly rather than mutating an audited
 * record.
 */
export async function createDraftRunViaApi(
  session: AuthSession,
  monthKey: string,
  fxRate = 0.0035,
): Promise<string> {
  // Look up first.
  const listRes = await session.api.get(`/api/commission-runs?monthPrefix=${monthKey}&limit=10`, {
    headers: bearer(session.accessToken),
  });
  if (listRes.ok()) {
    const { items } = (await listRes.json()) as {
      items: Array<{ id: string; monthKey: string; status: string }>;
    };
    const existing = items.find((r) => r.monthKey === monthKey);
    if (existing) {
      if (existing.status === 'draft') return existing.id;
      if (existing.status === 'rejected') {
        await reopenRunViaApi(session, existing.id);
        return existing.id;
      }
      if (existing.status === 'pending_approval') {
        await rejectRunViaApi(session, existing.id, 'e2e reset');
        await reopenRunViaApi(session, existing.id);
        return existing.id;
      }
      throw new Error(
        `monthKey ${monthKey} already has a ${existing.status} run (${existing.id}); ` +
          `cannot rewind safely — pick a different monthKey for this test`,
      );
    }
  }

  const res = await session.api.post('/api/commission-runs', {
    headers: bearer(session.accessToken),
    data: { monthKey, fxRateUsdToPkr: fxRate },
  });
  expect(res.ok(), `create run failed: ${res.status()} ${await res.text()}`).toBe(true);
  const body = (await res.json()) as { id: string };
  return body.id;
}

/** Fetch the current state of a run via the API. */
export async function getRunState(
  session: AuthSession,
  runId: string,
): Promise<{ status: string; lineItemCount: number }> {
  const res = await session.api.get(`/api/commission-runs/${runId}`, {
    headers: bearer(session.accessToken),
  });
  expect(res.ok(), `fetch run failed: ${res.status()}`).toBe(true);
  const body = (await res.json()) as { status: string; lineItems: unknown[] };
  return { status: body.status, lineItemCount: body.lineItems.length };
}

/** Submit a run for approval via API. */
export async function submitRunViaApi(session: AuthSession, runId: string): Promise<void> {
  const res = await session.api.post(`/api/commission-runs/${runId}/submit`, {
    headers: bearer(session.accessToken),
    data: { notes: 'e2e submit' },
  });
  expect(res.ok(), `submit failed: ${res.status()} ${await res.text()}`).toBe(true);
}

/** Approve a run via API — useful for setup steps where a UI walk isn't the SUT. */
export async function approveRunViaApi(
  session: AuthSession,
  runId: string,
  monthKey: string,
): Promise<void> {
  const monthLabel = monthLabelFor(monthKey).toUpperCase();
  const confirmationPhrase = `APPROVE ${monthLabel}`;
  const res = await session.api.post(`/api/commission-runs/${runId}/approve`, {
    headers: bearer(session.accessToken),
    data: { confirmationPhrase, notes: 'e2e approve' },
  });
  expect(res.ok(), `approve failed: ${res.status()} ${await res.text()}`).toBe(true);
}

/** Reject a run via API. */
export async function rejectRunViaApi(
  session: AuthSession,
  runId: string,
  reason: string,
): Promise<void> {
  const res = await session.api.post(`/api/commission-runs/${runId}/reject`, {
    headers: bearer(session.accessToken),
    data: { reason },
  });
  expect(res.ok(), `reject failed: ${res.status()} ${await res.text()}`).toBe(true);
}

/** Reopen a rejected run back to draft. */
export async function reopenRunViaApi(session: AuthSession, runId: string): Promise<void> {
  const res = await session.api.post(`/api/commission-runs/${runId}/reopen`, {
    headers: bearer(session.accessToken),
  });
  expect(res.ok(), `reopen failed: ${res.status()} ${await res.text()}`).toBe(true);
}

/** Patch a line item's leave / manual / held flags. */
export async function adjustLineItem(
  session: AuthSession,
  runId: string,
  lineItemId: string,
  input: {
    leaveAdjustmentUsd?: number;
    manualAdjustmentUsd?: number;
    manualAdjustmentNote?: string;
    isHeld?: boolean;
  },
): Promise<void> {
  const res = await session.api.patch(`/api/commission-runs/${runId}/line-items/${lineItemId}`, {
    headers: bearer(session.accessToken),
    data: input,
  });
  expect(res.ok(), `adjust failed: ${res.status()} ${await res.text()}`).toBe(true);
}

/**
 * Tear down test-created runs. Best-effort delete of the rows + their
 * line items via the API's reopen-then-delete chain. The API doesn't
 * expose DELETE on a run today, so we leave the row but force it to
 * an inert state (rejected with an e2e marker). Production data is
 * unaffected because tests use synthetic monthKeys.
 */
export async function cleanupTestRuns(session: AuthSession, runIds: string[]): Promise<void> {
  for (const id of runIds) {
    try {
      const stateRes = await session.api.get(`/api/commission-runs/${id}`, {
        headers: bearer(session.accessToken),
      });
      if (!stateRes.ok()) continue;
      const { status } = (await stateRes.json()) as { status: string };
      // Walk back to draft + rejected so the row is parked.
      if (status === 'approved' || status === 'locked') continue; // can't unwind safely
      if (status === 'pending_approval') {
        await rejectRunViaApi(session, id, 'e2e cleanup');
      } else if (status === 'draft') {
        // submit then reject so a single row ends up parked
        await submitRunViaApi(session, id);
        await rejectRunViaApi(session, id, 'e2e cleanup');
      }
    } catch {
      /* swallow — cleanup is best-effort */
    }
  }
}

/* ----------------- UI helpers ----------------- */

/** Open the run detail page and wait for the line items table to appear. */
export async function openRunDetail(page: Page, runId: string): Promise<void> {
  await page.goto(`${WEB_BASE}/monthly-processing/${runId}`);
  await page.waitForLoadState('networkidle');
}

/** Click "Submit for approval" in the run detail header. */
export async function submitRunViaUi(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Submit for approval/i }).click();
  // The submit dialog has a notes field + confirm button; accept defaults.
  const confirm = page.getByRole('button', { name: /^Submit$|^Confirm$/i });
  if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirm.click();
  }
}

/** Approve via UI: open the Approve dialog, type the phrase, confirm. */
export async function approveRunViaUi(page: Page, monthKey: string): Promise<void> {
  const monthLabel = monthLabelFor(monthKey).toUpperCase();
  await page.getByRole('button', { name: /^Approve( & lock)?/i }).click();
  const phraseInput = page.getByLabel(/confirmation phrase|type.*to confirm/i);
  await phraseInput.fill(`APPROVE ${monthLabel}`);
  await page
    .getByRole('button', { name: /^Approve/i })
    .last()
    .click();
}

/* ----------------- Tiny internals ----------------- */

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** '2026-04' → 'April 2026'. Used to derive the confirmation phrase. */
function monthLabelFor(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const names = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${names[month - 1] ?? monthStr} ${year}`;
}
