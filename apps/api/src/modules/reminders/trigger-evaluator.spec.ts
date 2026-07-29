import { describe, it, expect } from 'vitest';
import { resolveSourceForEvent } from './trigger-evaluator.service';

/**
 * resolveSourceForEvent is the fix for the "event rules on project /
 * commission / approval never fire" bug: previously only employeeId /
 * documentId payloads mapped to a source, so those entities resolved
 * to null and every source-dependent resolver produced zero recipients.
 */
describe('resolveSourceForEvent', () => {
  it('maps employee events to an employee source', () => {
    expect(resolveSourceForEvent('employee.terminated', { employeeId: 'e1' })).toEqual({
      kind: 'employee',
      id: 'e1',
    });
  });

  it('maps project events to a project source (via projectId)', () => {
    expect(resolveSourceForEvent('project.status.changed', { projectId: 'p1' })).toEqual({
      kind: 'project',
      id: 'p1',
    });
  });

  it('maps commission-run events to a commissionRun source (via runId)', () => {
    expect(resolveSourceForEvent('commission.run.approved', { runId: 'r1' })).toEqual({
      kind: 'commissionRun',
      id: 'r1',
    });
  });

  it('maps approval events to an approval source (via approvalId)', () => {
    expect(resolveSourceForEvent('approval.submitted', { approvalId: 'a1' })).toEqual({
      kind: 'approval',
      id: 'a1',
    });
  });

  it('falls back to `id` for an approval payload without approvalId', () => {
    expect(resolveSourceForEvent('approval.approved', { id: 'a2' })).toEqual({
      kind: 'approval',
      id: 'a2',
    });
  });

  it('returns null when the declared source id field is missing', () => {
    expect(resolveSourceForEvent('project.status.changed', { foo: 'bar' })).toBeNull();
  });

  it('uses the legacy employee heuristic for freeform events (sourceKind null)', () => {
    // commission.rule.published has sourceKind null in the catalog.
    expect(resolveSourceForEvent('commission.rule.published', { employeeId: 'e9' })).toEqual({
      kind: 'employee',
      id: 'e9',
    });
    expect(resolveSourceForEvent('commission.rule.published', { ruleId: 'x' })).toBeNull();
  });

  it('returns null for an unknown event type with no employee-shaped payload', () => {
    expect(resolveSourceForEvent('totally.unknown.event', { runId: 'r' })).toBeNull();
  });
});
