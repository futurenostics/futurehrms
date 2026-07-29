/**
 * Event-type catalog for the reminder-rule trigger picker.
 *
 * Today the FE used to hardcode a tiny list of 5 events; the backend
 * actually emits 20+. This catalog enumerates every event the system
 * publishes, grouped by domain prefix (employee, project, commission,
 * approval, …) so the picker can show them organised.
 *
 * Each entry also declares `sourceKind` — the entity the trigger
 * evaluator can hydrate from the payload. The condition builder reads
 * this to know which entity's fields to expose; the recipient
 * resolvers read it to know what `(kind, id)` shape to expect.
 *
 * Adding a new event later: append an entry here. No DB migration.
 *
 * The catalog is authoritative — `reminder-rules.service` rejects
 * any `eventType` that isn't in `KNOWN_EVENT_TYPES` at create/update
 * time, so rules can only bind to events the system actually emits.
 */

export type EventSourceKind =
  | 'employee'
  | 'employeeDocument'
  | 'project'
  | 'commissionRun'
  | 'approval'
  | null;

export interface EventTypeDef {
  /** Fully-qualified event type — exactly what `EventBusService.emit()` publishes. */
  type: string;
  /** Human label. Picker option text. */
  label: string;
  /** One-line description, shown as the option's secondary line. */
  description: string;
  /** Domain prefix used as the picker's group heading. */
  group: string;
  /**
   * Entity this event's payload carries. `null` means the payload
   * is freeform / non-entity (e.g. system events).
   */
  sourceKind: EventSourceKind;
}

export const EVENT_TYPES: EventTypeDef[] = [
  /* ---------- Employee ---------- */
  {
    type: 'employee.created',
    label: 'Employee created',
    description: 'A new employee joined the org.',
    group: 'Employee',
    sourceKind: 'employee',
  },
  {
    type: 'employee.updated',
    label: 'Employee updated',
    description: 'Any field on an employee was edited.',
    group: 'Employee',
    sourceKind: 'employee',
  },
  {
    type: 'employee.terminated',
    label: 'Employee terminated',
    description: 'Employee status moved to terminated.',
    group: 'Employee',
    sourceKind: 'employee',
  },
  {
    type: 'employee.status.changed',
    label: 'Employee status changed',
    description: 'Active ↔ on-leave / notice / terminated transitions.',
    group: 'Employee',
    sourceKind: 'employee',
  },
  {
    type: 'employee.manager.changed',
    label: 'Employee manager changed',
    description: 'A different manager was assigned.',
    group: 'Employee',
    sourceKind: 'employee',
  },
  {
    type: 'employee.salary.updated',
    label: 'Employee salary updated',
    description: 'A new SalaryHistory row landed (raise, correction).',
    group: 'Employee',
    sourceKind: 'employee',
  },
  {
    type: 'employee.deleted',
    label: 'Employee deleted',
    description: 'Soft-delete on the Employee row.',
    group: 'Employee',
    sourceKind: 'employee',
  },

  /* ---------- Project ---------- */
  {
    type: 'project.created',
    label: 'Project created',
    description: 'New project added.',
    group: 'Project',
    sourceKind: 'project',
  },
  {
    type: 'project.updated',
    label: 'Project updated',
    description: 'Any field on a project was edited.',
    group: 'Project',
    sourceKind: 'project',
  },
  {
    type: 'project.status.changed',
    label: 'Project status changed',
    description: 'draft → active → in_billing → completed / on_hold / etc.',
    group: 'Project',
    sourceKind: 'project',
  },
  {
    type: 'project.deleted',
    label: 'Project deleted',
    description: 'Project soft-deleted.',
    group: 'Project',
    sourceKind: 'project',
  },
  {
    type: 'project.role.assigned',
    label: 'Project role assigned',
    description: 'An employee was assigned a role on a project.',
    group: 'Project',
    sourceKind: 'project',
  },
  {
    type: 'project.role.removed',
    label: 'Project role removed',
    description: 'An employee was removed from a project role.',
    group: 'Project',
    sourceKind: 'project',
  },

  /* ---------- Commission ---------- */
  {
    type: 'commission.rule.published',
    label: 'Commission rule published',
    description: 'A draft commission rule moved to active.',
    group: 'Commission',
    sourceKind: null,
  },
  {
    type: 'commission.run.created',
    label: 'Commission run created',
    description: 'A new monthly run was instantiated as draft.',
    group: 'Commission',
    sourceKind: 'commissionRun',
  },
  {
    type: 'commission.run.recalculated',
    label: 'Commission run recalculated',
    description: "The run's line items were regenerated.",
    group: 'Commission',
    sourceKind: 'commissionRun',
  },
  {
    type: 'commission.run.submitted_for_approval',
    label: 'Commission run submitted',
    description: 'HR sent the run to Finance for approval.',
    group: 'Commission',
    sourceKind: 'commissionRun',
  },
  {
    type: 'commission.run.approved',
    label: 'Commission run approved',
    description: 'Finance approved the run.',
    group: 'Commission',
    sourceKind: 'commissionRun',
  },
  {
    type: 'commission.run.rejected',
    label: 'Commission run rejected',
    description: 'Finance rejected the run back to draft.',
    group: 'Commission',
    sourceKind: 'commissionRun',
  },
  {
    type: 'commission.run.locked',
    label: 'Commission run locked',
    description: 'The approved run was sealed for payout.',
    group: 'Commission',
    sourceKind: 'commissionRun',
  },
  {
    type: 'commission.run.exported',
    label: 'Commission run exported',
    description: 'Run CSV was downloaded.',
    group: 'Commission',
    sourceKind: 'commissionRun',
  },
  {
    type: 'commission.line_item.adjusted',
    label: 'Commission line item adjusted',
    description: 'A single line on a draft run was tweaked.',
    group: 'Commission',
    sourceKind: 'commissionRun',
  },

  /* ---------- Approval (generic) ---------- */
  {
    type: 'approval.submitted',
    label: 'Approval submitted',
    description: 'Anyone submitted an approvable for review.',
    group: 'Approval',
    sourceKind: 'approval',
  },
  {
    type: 'approval.approved',
    label: 'Approval approved',
    description: 'An approval landed in the approved terminal state.',
    group: 'Approval',
    sourceKind: 'approval',
  },
  {
    type: 'approval.rejected',
    label: 'Approval rejected',
    description: 'An approval was rejected.',
    group: 'Approval',
    sourceKind: 'approval',
  },
  {
    type: 'approval.cancelled',
    label: 'Approval cancelled',
    description: 'An approval was cancelled (admin or system).',
    group: 'Approval',
    sourceKind: 'approval',
  },
];

export interface EventCatalogResponse {
  events: EventTypeDef[];
  /** Unique group names in display order — saves the FE the dedup work. */
  groups: string[];
}

export function buildEventCatalogResponse(): EventCatalogResponse {
  const groups: string[] = [];
  for (const e of EVENT_TYPES) {
    if (!groups.includes(e.group)) groups.push(e.group);
  }
  return { events: EVENT_TYPES, groups };
}

/** O(1) lookup table — used by the rules service to validate eventType. */
export const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set(EVENT_TYPES.map((e) => e.type));

/** O(1) event-type → definition lookup. */
const EVENT_TYPE_BY_NAME: ReadonlyMap<string, EventTypeDef> = new Map(
  EVENT_TYPES.map((e) => [e.type, e]),
);

/**
 * The source entity an event's payload carries, per the catalog.
 * Returns `null` for freeform / non-entity events and for unknown
 * types. The trigger evaluator uses this to map the payload to a
 * concrete `(kind, id)` source instead of guessing from field names.
 */
export function sourceKindForEvent(type: string): EventSourceKind {
  return EVENT_TYPE_BY_NAME.get(type)?.sourceKind ?? null;
}
