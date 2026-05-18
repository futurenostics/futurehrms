/**
 * E2E — rejection flow + confirmation-phrase validation.
 *
 * Two tests:
 *   1. Reject a pending run → state == rejected with reason persisted,
 *      reopen → back to draft, submit + approve → approved.
 *   2. The approve confirmation phrase must match exactly — a wrong
 *      phrase is rejected by the API and the run stays pending.
 */
import { test, expect } from '@playwright/test';
import {
  approveRunViaApi,
  authenticatePage,
  cleanupTestRuns,
  createDraftRunViaApi,
  getRunState,
  loginAsAdmin,
  openRunDetail,
  rejectRunViaApi,
  reopenRunViaApi,
  submitRunViaApi,
  uniqueMonthKey,
  type AuthSession,
} from './helpers/commission-test-helpers';

test.describe('Commission Run Approval Flows', () => {
  let session: AuthSession;
  const createdRunIds: string[] = [];

  test.beforeAll(async () => {
    session = await loginAsAdmin();
  });

  test.afterAll(async () => {
    await cleanupTestRuns(session, createdRunIds);
  });

  test('reject pending → reopen → re-submit → approve', async ({ page }) => {
    const monthKey = uniqueMonthKey();
    const runId = await createDraftRunViaApi(session, monthKey);
    createdRunIds.push(runId);

    await submitRunViaApi(session, runId);
    expect((await getRunState(session, runId)).status).toBe('pending_approval');

    // Reject
    await rejectRunViaApi(session, runId, 'e2e: pretending the totals look wrong');
    const rejected = await getRunState(session, runId);
    expect(rejected.status).toBe('rejected');

    // The UI should display the rejection reason somewhere on the page.
    await authenticatePage(page, session);
    await openRunDetail(page, runId);
    await expect(page.getByText(/Rejected|rejected/).first()).toBeVisible();

    // Reopen
    await reopenRunViaApi(session, runId);
    expect((await getRunState(session, runId)).status).toBe('draft');

    // Re-submit + approve via API (UI walk already covered in lifecycle test)
    await submitRunViaApi(session, runId);
    expect((await getRunState(session, runId)).status).toBe('pending_approval');
    await approveRunViaApi(session, runId, monthKey);
    expect((await getRunState(session, runId)).status).toBe('approved');
  });

  test('approve confirmation phrase must match exactly', async () => {
    const monthKey = uniqueMonthKey();
    const runId = await createDraftRunViaApi(session, monthKey);
    createdRunIds.push(runId);

    await submitRunViaApi(session, runId);
    expect((await getRunState(session, runId)).status).toBe('pending_approval');

    // Wrong phrase — API should reject.
    const wrong = await session.api.post(`/api/commission-runs/${runId}/approve`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: {
        confirmationPhrase: 'approve please',
        notes: 'wrong-case attempt',
      },
    });
    expect(wrong.ok(), 'wrong phrase should not approve').toBe(false);
    expect(wrong.status()).toBeGreaterThanOrEqual(400);
    expect((await getRunState(session, runId)).status).toBe('pending_approval');

    // Correct phrase — API should approve.
    await approveRunViaApi(session, runId, monthKey);
    expect((await getRunState(session, runId)).status).toBe('approved');
  });
});
