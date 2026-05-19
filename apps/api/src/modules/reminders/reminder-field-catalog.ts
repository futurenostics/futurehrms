/**
 * Field catalog for the reminder-rule condition builder.
 *
 * Static metadata describing which dotted paths are queryable for
 * each business entity, what type the value is, and (for enums and
 * relations) what value options the picker should show.
 *
 * The FE reads this once on sheet open and renders:
 *   - the field picker (grouped by entity)
 *   - the operator menu (filtered by field type)
 *   - the value input (typed — Input / DatePicker / Combobox / Switch)
 *
 * Adding fields later: append to ENTITIES; no migration required.
 * The evaluator (reminder-conditions.evaluator.ts) is path-agnostic
 * so any path landing here lights up automatically.
 *
 * NOT exposed here on purpose:
 *   - AuditLog, RefreshToken, Role, Permission, UserRole — infra
 *   - Reminder, Notification, Approval, ApprovalDecision — derived
 *   - SalaryHistory, TimelineEntry — historical snapshots; reach
 *     these via the parent (Employee.salaryPkr) until we add a
 *     "relation aggregate" operator family.
 *
 * Conventions:
 *   - `path` is dotted starting with the source-entity slug so
 *     event payloads (which arrive as
 *     `{ employee: {...}, oldEmployee: {...} }`) resolve cleanly.
 *   - `label` is "Entity › Subentity › Field" when crossing a
 *     relation, single-segment when on the parent entity. The FE
 *     splits on '›' for the dropdown's two-line layout.
 */

export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'enum';

export interface FieldDef {
  /** Dotted path scoped to the source entity. */
  path: string;
  /** Human-readable label. Uses ' › ' to separate relation hops. */
  label: string;
  /** Type drives the operator menu + value input. */
  type: FieldType;
  /** For enum: known string values + display labels. */
  enumValues?: Array<{ value: string; label: string }>;
  /** Owning entity key (employee, project, …). */
  entity: string;
  /** Quick hint shown next to the value input. */
  hint?: string;
}

export interface EntityDef {
  key: string;
  label: string;
  description: string;
  fields: FieldDef[];
}

/* ---------- Enum value lists (kept tight; freeform strings should
   be left without enumValues so the user can type any value) ---------- */

const EMPLOYEE_STATUS_SLUGS = [
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On leave' },
  { value: 'notice', label: 'Serving notice' },
  { value: 'terminated', label: 'Terminated' },
];

const CONTRACT_TYPES = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'fixed_term', label: 'Fixed term' },
  { value: 'internship', label: 'Internship' },
  { value: 'consultant', label: 'Consultant' },
];

const PROJECT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'in_billing', label: 'In billing' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const COMMISSION_RULE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'archived', label: 'Archived' },
];

const COMMISSION_RULE_POOL_MODES = [
  { value: 'percentage', label: 'Percentage of revenue' },
  { value: 'fixed', label: 'Fixed amount' },
];

const COMMISSION_RUN_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'locked', label: 'Locked' },
];

/* ---------- Entity catalog ----------
 * Order in this list = order in the picker. Keep frequently-used
 * entities first.
 */

export const ENTITIES: EntityDef[] = [
  {
    key: 'employee',
    label: 'Employee',
    description: 'The employee involved in the trigger (e.g. probation owner, birthday person).',
    fields: [
      { entity: 'employee', path: 'employee.eid', label: 'EID', type: 'string' },
      { entity: 'employee', path: 'employee.fullName', label: 'Full name', type: 'string' },
      { entity: 'employee', path: 'employee.email', label: 'Email', type: 'string' },
      {
        entity: 'employee',
        path: 'employee.contractType',
        label: 'Contract type',
        type: 'enum',
        enumValues: CONTRACT_TYPES,
      },
      {
        entity: 'employee',
        path: 'employee.eligibleForCommissions',
        label: 'Eligible for commissions',
        type: 'boolean',
      },
      {
        entity: 'employee',
        path: 'employee.salaryPkr',
        label: 'Salary (PKR)',
        type: 'number',
        hint: 'Latest active salary',
      },
      { entity: 'employee', path: 'employee.joinDate', label: 'Join date', type: 'date' },
      {
        entity: 'employee',
        path: 'employee.dateOfBirth',
        label: 'Date of birth',
        type: 'date',
      },
      {
        entity: 'employee',
        path: 'employee.probationEndDate',
        label: 'Probation end date',
        type: 'date',
      },
      {
        entity: 'employee',
        path: 'employee.internshipEndDate',
        label: 'Internship end date',
        type: 'date',
      },
      {
        entity: 'employee',
        path: 'employee.terminatedAt',
        label: 'Terminated at',
        type: 'date',
      },
      {
        entity: 'employee',
        path: 'employee.noticePeriodStart',
        label: 'Notice period start',
        type: 'date',
      },
      {
        entity: 'employee',
        path: 'employee.department.slug',
        label: 'Department › Slug',
        type: 'string',
      },
      {
        entity: 'employee',
        path: 'employee.department.name',
        label: 'Department › Name',
        type: 'string',
      },
      {
        entity: 'employee',
        path: 'employee.department.isActive',
        label: 'Department › Active',
        type: 'boolean',
      },
      {
        entity: 'employee',
        path: 'employee.designation.name',
        label: 'Designation › Name',
        type: 'string',
      },
      {
        entity: 'employee',
        path: 'employee.status.slug',
        label: 'Status › Slug',
        type: 'enum',
        enumValues: EMPLOYEE_STATUS_SLUGS,
      },
      {
        entity: 'employee',
        path: 'employee.status.isTerminal',
        label: 'Status › Terminal',
        type: 'boolean',
      },
      {
        entity: 'employee',
        path: 'employee.manager.fullName',
        label: 'Manager › Full name',
        type: 'string',
      },
      {
        entity: 'employee',
        path: 'employee.manager.eid',
        label: 'Manager › EID',
        type: 'string',
      },
    ],
  },
  {
    key: 'department',
    label: 'Department',
    description: 'Reach when the trigger anchors on a department (org-wide reminders).',
    fields: [
      { entity: 'department', path: 'department.slug', label: 'Slug', type: 'string' },
      { entity: 'department', path: 'department.name', label: 'Name', type: 'string' },
      { entity: 'department', path: 'department.isActive', label: 'Active', type: 'boolean' },
    ],
  },
  {
    key: 'designation',
    label: 'Designation',
    description: 'Title-scoped triggers — e.g. all engineers, only senior roles.',
    fields: [
      { entity: 'designation', path: 'designation.name', label: 'Name', type: 'string' },
      { entity: 'designation', path: 'designation.isActive', label: 'Active', type: 'boolean' },
      {
        entity: 'designation',
        path: 'designation.department.slug',
        label: 'Department › Slug',
        type: 'string',
      },
    ],
  },
  {
    key: 'employeeDocument',
    label: 'Employee document',
    description: 'Visa, contract, NDA, etc. attached to an employee.',
    fields: [
      {
        entity: 'employeeDocument',
        path: 'employeeDocument.type',
        label: 'Type',
        type: 'string',
        hint: 'e.g. visa, contract, nda',
      },
      {
        entity: 'employeeDocument',
        path: 'employeeDocument.label',
        label: 'Label',
        type: 'string',
      },
      {
        entity: 'employeeDocument',
        path: 'employeeDocument.expiresAt',
        label: 'Expires at',
        type: 'date',
      },
      {
        entity: 'employeeDocument',
        path: 'employeeDocument.employee.eid',
        label: 'Employee › EID',
        type: 'string',
      },
      {
        entity: 'employeeDocument',
        path: 'employeeDocument.employee.department.slug',
        label: 'Employee › Department › Slug',
        type: 'string',
      },
    ],
  },
  {
    key: 'project',
    label: 'Project',
    description: 'Project-anchored triggers — status changes, dates, revenue.',
    fields: [
      { entity: 'project', path: 'project.name', label: 'Name', type: 'string' },
      { entity: 'project', path: 'project.clientName', label: 'Client name', type: 'string' },
      {
        entity: 'project',
        path: 'project.status',
        label: 'Status',
        type: 'enum',
        enumValues: PROJECT_STATUSES,
      },
      { entity: 'project', path: 'project.revenueUsd', label: 'Revenue (USD)', type: 'number' },
      { entity: 'project', path: 'project.startDate', label: 'Start date', type: 'date' },
      {
        entity: 'project',
        path: 'project.expectedCompletionDate',
        label: 'Expected completion',
        type: 'date',
      },
      {
        entity: 'project',
        path: 'project.hasOverride',
        label: 'Has override',
        type: 'boolean',
      },
      {
        entity: 'project',
        path: 'project.department.slug',
        label: 'Department › Slug',
        type: 'string',
      },
      {
        entity: 'project',
        path: 'project.category.slug',
        label: 'Category › Slug',
        type: 'string',
      },
      {
        entity: 'project',
        path: 'project.category.archived',
        label: 'Category › Archived',
        type: 'boolean',
      },
    ],
  },
  {
    key: 'projectCategory',
    label: 'Project category',
    description: 'Category-anchored triggers — archiving, renaming, default rule changes.',
    fields: [
      {
        entity: 'projectCategory',
        path: 'projectCategory.slug',
        label: 'Slug',
        type: 'string',
      },
      {
        entity: 'projectCategory',
        path: 'projectCategory.name',
        label: 'Name',
        type: 'string',
      },
      {
        entity: 'projectCategory',
        path: 'projectCategory.archived',
        label: 'Archived',
        type: 'boolean',
      },
    ],
  },
  {
    key: 'projectAssignment',
    label: 'Project assignment',
    description: 'Role assignment on a project — who, what role, when.',
    fields: [
      {
        entity: 'projectAssignment',
        path: 'projectAssignment.roleName',
        label: 'Role',
        type: 'string',
      },
      {
        entity: 'projectAssignment',
        path: 'projectAssignment.percentage',
        label: 'Percentage',
        type: 'number',
      },
      {
        entity: 'projectAssignment',
        path: 'projectAssignment.assignedAt',
        label: 'Assigned at',
        type: 'date',
      },
      {
        entity: 'projectAssignment',
        path: 'projectAssignment.removedAt',
        label: 'Removed at',
        type: 'date',
      },
      {
        entity: 'projectAssignment',
        path: 'projectAssignment.project.name',
        label: 'Project › Name',
        type: 'string',
      },
      {
        entity: 'projectAssignment',
        path: 'projectAssignment.employee.eid',
        label: 'Employee › EID',
        type: 'string',
      },
    ],
  },
  {
    key: 'commissionRule',
    label: 'Commission rule',
    description: 'Versioned commission rule — published, archived, etc.',
    fields: [
      {
        entity: 'commissionRule',
        path: 'commissionRule.department',
        label: 'Department slug',
        type: 'string',
      },
      {
        entity: 'commissionRule',
        path: 'commissionRule.version',
        label: 'Version',
        type: 'string',
      },
      {
        entity: 'commissionRule',
        path: 'commissionRule.status',
        label: 'Status',
        type: 'enum',
        enumValues: COMMISSION_RULE_STATUSES,
      },
      {
        entity: 'commissionRule',
        path: 'commissionRule.poolMode',
        label: 'Pool mode',
        type: 'enum',
        enumValues: COMMISSION_RULE_POOL_MODES,
      },
      {
        entity: 'commissionRule',
        path: 'commissionRule.poolValue',
        label: 'Pool value',
        type: 'number',
      },
      {
        entity: 'commissionRule',
        path: 'commissionRule.minProjectRevenueUsd',
        label: 'Min project revenue (USD)',
        type: 'number',
      },
      {
        entity: 'commissionRule',
        path: 'commissionRule.category.slug',
        label: 'Category › Slug',
        type: 'string',
      },
    ],
  },
  {
    key: 'commissionRun',
    label: 'Commission run',
    description: 'Monthly commission run — submit / approve / lock lifecycle.',
    fields: [
      {
        entity: 'commissionRun',
        path: 'commissionRun.monthKey',
        label: 'Month (YYYY-MM)',
        type: 'string',
      },
      {
        entity: 'commissionRun',
        path: 'commissionRun.status',
        label: 'Status',
        type: 'enum',
        enumValues: COMMISSION_RUN_STATUSES,
      },
      {
        entity: 'commissionRun',
        path: 'commissionRun.fxRateUsdToPkr',
        label: 'FX rate USD→PKR',
        type: 'number',
      },
      {
        entity: 'commissionRun',
        path: 'commissionRun.approverIsSubmitter',
        label: 'Approver = submitter',
        type: 'boolean',
      },
    ],
  },
];

/**
 * Operator menu per type. Mirrors what the evaluator implements.
 * Keep in sync with apps/api/.../reminder-conditions.evaluator.ts.
 */
export const OPERATORS_BY_TYPE: Record<FieldType, Array<{ id: string; label: string }>> = {
  string: [
    { id: 'equals', label: 'equals' },
    { id: 'not_equals', label: 'does not equal' },
    { id: 'contains', label: 'contains' },
    { id: 'starts_with', label: 'starts with' },
    { id: 'ends_with', label: 'ends with' },
    { id: 'in', label: 'is any of' },
    { id: 'not_in', label: 'is none of' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is set' },
  ],
  number: [
    { id: 'equals', label: 'equals' },
    { id: 'not_equals', label: 'does not equal' },
    { id: 'gt', label: '>' },
    { id: 'gte', label: '≥' },
    { id: 'lt', label: '<' },
    { id: 'lte', label: '≤' },
    { id: 'between', label: 'between' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is set' },
  ],
  date: [
    { id: 'before', label: 'is before' },
    { id: 'after', label: 'is after' },
    { id: 'within_days', label: 'is within next (days)' },
    { id: 'older_than_days', label: 'is older than (days)' },
    { id: 'in_exactly_days', label: 'is in exactly (days)' },
    { id: 'anniversary_in_exactly_days', label: 'anniversary is in exactly (days)' },
    { id: 'matches_today_month_day', label: 'is today (anniversary)' },
    { id: 'matches_today', label: 'is today' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is set' },
  ],
  boolean: [
    { id: 'is_true', label: 'is true' },
    { id: 'is_false', label: 'is false' },
  ],
  enum: [
    { id: 'equals', label: 'is' },
    { id: 'not_equals', label: 'is not' },
    { id: 'in', label: 'is any of' },
    { id: 'not_in', label: 'is none of' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is set' },
  ],
};

export interface FieldCatalogResponse {
  entities: EntityDef[];
  operators: typeof OPERATORS_BY_TYPE;
}

export function buildFieldCatalogResponse(): FieldCatalogResponse {
  return { entities: ENTITIES, operators: OPERATORS_BY_TYPE };
}
