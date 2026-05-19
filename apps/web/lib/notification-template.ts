/**
 * Notification template helpers — interpolation, variable catalog,
 * caret-aware insertion.
 *
 * Mirrors `NotificationTypesRegistry.interpolate` on the BE so the
 * FE preview never drifts from what the recipient actually sees.
 * `{{var}}` → `String(payload[var] ?? '')`, whitespace inside the
 * braces tolerated, missing keys render as empty string.
 *
 * The variable catalog is FE-only — it just enumerates payload keys
 * the author can lean on when writing templates, so the create/edit
 * sheet can surface them as click-to-insert chips and seed the
 * sample-payload textarea. Keep it in sync with the keys the
 * notification senders actually put on payloads (see
 * `NotificationsService.send`, `TriggerEvaluatorService`,
 * `ReminderSchedulerService`).
 */

export const INTERPOLATE_REGEX = /\{\{\s*(\w+)\s*\}\}/g;

export function interpolate(
  template: string,
  payload: Record<string, unknown> | null | undefined,
): string {
  if (!payload) return template.replace(INTERPOLATE_REGEX, '');
  return template.replace(INTERPOLATE_REGEX, (_, key: string) => {
    const v = payload[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

/** Pull every `{{var}}` reference out of a template. Deduped, in
 *  source order. Used by the preview pane to mark vars the current
 *  sample payload doesn't satisfy. */
export function extractVariables(template: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of template.matchAll(INTERPOLATE_REGEX)) {
    const name = m[1];
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/**
 * Variable catalog grouped by source kind. The Universal group is
 * always shown; the kind-specific group is added based on which
 * source entity the notification is keyed off (employee, project,
 * commission run, employee document).
 */
export interface VariableSuggestion {
  key: string;
  /** Sample value used to seed the preview payload. */
  sample: string;
  /** One-line description shown on hover. */
  description: string;
}

export interface VariableGroup {
  /** Display heading for the chip rail. */
  label: string;
  /**
   * Source kind this group belongs to. `null` = universal (shown
   * always). Other values match `EventSourceKind` from the event
   * catalog so callers can filter by the rule's event source.
   */
  sourceKind: 'employee' | 'project' | 'commissionRun' | 'employeeDocument' | null;
  variables: VariableSuggestion[];
}

export const VARIABLE_CATALOG: VariableGroup[] = [
  {
    label: 'Universal',
    sourceKind: null,
    variables: [
      { key: 'ruleName', sample: 'Probation end', description: 'Name of the firing reminder rule' },
      { key: 'ruleKey', sample: 'probation-end-eng', description: 'Slug of the firing rule' },
      {
        key: 'firedAt',
        sample: '2026-05-19T09:00:00Z',
        description: 'ISO timestamp the notification was dispatched',
      },
    ],
  },
  {
    label: 'Employee',
    sourceKind: 'employee',
    variables: [
      { key: 'employeeName', sample: 'Ayesha Khan', description: 'Full name of the employee' },
      { key: 'employeeEid', sample: 'FN-021', description: 'Employee ID (EID stamp)' },
      {
        key: 'employeeEmail',
        sample: 'ayesha@futurenostics.local',
        description: 'Work email address',
      },
      { key: 'departmentName', sample: 'Engineering', description: 'Department display name' },
      { key: 'designationName', sample: 'Sr. Engineer', description: 'Designation / role title' },
      { key: 'managerName', sample: 'Asma Ali', description: 'Direct manager’s full name' },
    ],
  },
  {
    label: 'Project',
    sourceKind: 'project',
    variables: [
      { key: 'projectName', sample: 'Q3 Web rebuild', description: 'Project display name' },
      { key: 'projectCode', sample: 'WEB-Q3', description: 'Project short code' },
      { key: 'clientName', sample: 'Acme Corp', description: 'Client the project bills to' },
      { key: 'projectStatus', sample: 'in_billing', description: 'Current project status slug' },
    ],
  },
  {
    label: 'Commission run',
    sourceKind: 'commissionRun',
    variables: [
      { key: 'runMonthKey', sample: '2026-05', description: 'YYYY-MM the run covers' },
      { key: 'runStatus', sample: 'pending_approval', description: 'Lifecycle status slug' },
    ],
  },
  {
    label: 'Employee document',
    sourceKind: 'employeeDocument',
    variables: [
      { key: 'documentKind', sample: 'visa', description: 'Document type slug' },
      { key: 'documentExpiresAt', sample: '2026-08-19', description: 'Expiry date (ISO)' },
      { key: 'employeeName', sample: 'Ayesha Khan', description: 'Full name of the employee' },
    ],
  },
];

/** Resolve the groups to show for a given source kind. Always
 *  includes Universal; appends the kind-specific group when set. If
 *  the caller doesn't know the kind, returns every group so the
 *  custom-types sheet stays useful when detached from any rule. */
export function variableGroupsForSourceKind(
  sourceKind: string | null | undefined,
): VariableGroup[] {
  const universal = VARIABLE_CATALOG.filter((g) => g.sourceKind === null);
  if (!sourceKind) return VARIABLE_CATALOG;
  const matched = VARIABLE_CATALOG.filter((g) => g.sourceKind === sourceKind);
  return [...universal, ...matched];
}

/** Flatten a group list into a {key → sample} record. Used to seed
 *  the editable sample payload in the preview pane. */
export function defaultSamplePayload(
  groups: VariableGroup[] = VARIABLE_CATALOG,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const g of groups) {
    for (const v of g.variables) {
      // Last-write-wins on duplicates (employeeName appears in both
      // Employee and Employee document) — both samples are the same.
      out[v.key] = v.sample;
    }
  }
  return out;
}

/**
 * Insert text at the current selection of an input/textarea,
 * preserving cursor position. Uses `setRangeText` which works on
 * both `HTMLInputElement` and `HTMLTextAreaElement`. Calls the
 * passed onChange so React state stays in sync.
 */
export function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  onChange: (next: string) => void,
): void {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.setRangeText(text, start, end, 'end');
  onChange(el.value);
  // Re-focus so the next chip click also lands at the right spot.
  el.focus();
}

/** Split a template into source-view tokens, marking variable
 *  occurrences so the source view can highlight them. */
export interface TemplateToken {
  kind: 'text' | 'var';
  value: string;
  /** For `var` tokens — true when the sample payload has no entry
   *  for this key. Drives the "unset" pill styling in the preview. */
  unset?: boolean;
}

export function tokenizeTemplate(
  template: string,
  payload: Record<string, unknown> | null | undefined,
): TemplateToken[] {
  const out: TemplateToken[] = [];
  let i = 0;
  for (const m of template.matchAll(INTERPOLATE_REGEX)) {
    const idx = m.index ?? 0;
    if (idx > i) out.push({ kind: 'text', value: template.slice(i, idx) });
    const name = m[1] ?? '';
    const has = payload != null && name in payload && payload[name] != null;
    out.push({ kind: 'var', value: name, unset: !has });
    i = idx + m[0].length;
  }
  if (i < template.length) out.push({ kind: 'text', value: template.slice(i) });
  return out;
}
