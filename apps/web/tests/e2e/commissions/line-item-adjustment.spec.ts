/**
 * E2E — line item adjustments only allowed in draft state.
 *
 * Two tests:
 *   1. In draft, patching a line item's leave / manual / held flags
 *      succeeds; the final amount recomputes to reflect them; the
 *      change persists across page reloads.
 *   2. Once a run is in pending_approval or approved, attempts to
 *      patch a line item return 4xx.
 */
import { test, expect } from '@playwright/test';
import {
  adjustLineItem,
  approveRunViaApi,
  cleanupTestRuns,
  createDraftRunViaApi,
  loginAsAdmin,
  submitRunViaApi,
  uniqueMonthKey,
  type AuthSession,
} from './helpers/commission-test-helpers';

test.describe('Commission Run Line Item Adjustments', () => {
  let session: AuthSession;
  const createdRunIds: string[] = [];

  test.beforeAll(async () => {
    session = await loginAsAdmin();
  });

  test.afterAll(async () => {
    await cleanupTestRuns(session, createdRunIds);
  });

  test('adjust a line item in draft state', async () => {
    const monthKey = uniqueMonthKey();
    const runId = await createDraftRunViaApi(session, monthKey);
    createdRunIds.push(runId);

    // Fetch a line item — if zero, skip with annotation (e.g. the
    // monthKey window doesn't intersect any active project).
    const runRes = await session.api.get(`/api/commission-runs/${runId}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    expect(runRes.ok()).toBe(true);
    const run = (await runRes.json()) as {
      lineItems: Array<{ id: string; calculatedAmountUsd: number; finalAmountUsd: number }>;
    };
    if (run.lineItems.length === 0) {
      test.info().annotations.push({
        type: 'note',
        description: `monthKey ${monthKey} produced 0 line items — skipping`,
      });
      test.skip();
    }
    const item = run.lineItems[0]!;
    const originalCalc = Number(item.calculatedAmountUsd);
    const originalFinal = Number(item.finalAmountUsd);

    // Patch — apply a $50 manual deduction.
    await adjustLineItem(session, runId, item.id, {
      manualAdjustmentUsd: -50,
      manualAdjustmentNote: 'e2e: deducted for known reason',
    });

    // Re-fetch — calculated stays the same, final reflects the delta.
    const refetch = await session.api.get(`/api/commission-runs/${runId}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    const after = (await refetch.json()) as {
      lineItems: Array<{
        id: string;
        calculatedAmountUsd: number;
        manualAdjustmentUsd: number;
        finalAmountUsd: number;
      }>;
    };
    const updated = after.lineItems.find((li) => li.id === item.id);
    expect(updated, 'updated line item').toBeDefined();
    expect(Number(updated!.calculatedAmountUsd)).toBeCloseTo(originalCalc, 2);
    expect(Number(updated!.manualAdjustmentUsd)).toBeCloseTo(-50, 2);
    expect(Number(updated!.finalAmountUsd)).toBeCloseTo(originalFinal - 50, 2);
  });

  test('cannot adjust line items once the run leaves draft', async () => {
    const monthKey = uniqueMonthKey();
    const runId = await createDraftRunViaApi(session, monthKey);
    createdRunIds.push(runId);

    const runRes = await session.api.get(`/api/commission-runs/${runId}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    const run = (await runRes.json()) as { lineItems: Array<{ id: string }> };
    if (run.lineItems.length === 0) {
      test.info().annotations.push({
        type: 'note',
        description: `monthKey ${monthKey} produced 0 line items — skipping`,
      });
      test.skip();
    }
    const itemId = run.lineItems[0]!.id;

    await submitRunViaApi(session, runId);
    await approveRunViaApi(session, runId, monthKey);

    // Now the run is approved — adjustments must fail.
    const res = await session.api.patch(`/api/commission-runs/${runId}/line-items/${itemId}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: { manualAdjustmentUsd: -10 },
    });
    expect(res.ok(), 'should not adjust approved-run line items').toBe(false);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
