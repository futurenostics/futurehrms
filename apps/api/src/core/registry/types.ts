/**
 * Module manifest contract.
 *
 * Every domain module under `src/modules/<name>/` exports a manifest of
 * this shape. The core RegistryService boots the application by iterating
 * the manifests it's been given, then:
 *   - upserting `Permission` rows for each declared permission,
 *   - mounting nav items behind permission gates,
 *   - scheduling BullMQ cron jobs,
 *   - wiring event subscriptions,
 *   - aggregating dashboard widgets, approvables, and settings pages.
 *
 * Adding a new module = adding a folder + a manifest entry in app.module.
 */

export interface PermissionDefinition {
  /** Verb on the module — e.g. 'view', 'create', 'approve'. */
  action: string;
  /** Human-friendly description, surfaced in the role-management UI. */
  description: string;
}

export interface NavItemDefinition {
  label: string;
  path: string;
  /** lucide-react icon name, e.g. 'Calculator'. */
  icon?: string;
  /** Required permission key — e.g. 'commissions:view'. */
  requires?: string;
  /** For nested groups in the sidebar. */
  group?: string;
  order?: number;
}

export interface ScheduledJobDefinition {
  /** Unique queue + job identifier — e.g. 'reminders.daily-scan'. */
  name: string;
  /** Cron expression, evaluated in Asia/Karachi. */
  cron: string;
  /** Provider method on the module's job service that handles the tick. */
  handler: string;
}

export interface EventSubscriptionDefinition {
  /** Fully-qualified event type — e.g. 'employee.created'. */
  event: string;
  /** Provider method on the module's event handler service. */
  handler: string;
}

export interface DashboardWidgetDefinition {
  key: string;
  title: string;
  /** Permission key that gates visibility. */
  requires?: string;
  /** Optional ordering hint within a dashboard. */
  order?: number;
}

export interface ApprovableDefinition {
  /** Discriminator for the approval engine — e.g. 'commission-run'. */
  kind: string;
  /** Label shown in the approval inbox. */
  label: string;
  /** Permission required to act on this approvable. */
  requires: string;
}

export interface SettingsPageDefinition {
  key: string;
  label: string;
  path: string;
  requires: string;
  group?: string;
  order?: number;
}

export interface DefaultRoleAttachment {
  /** System role slug — e.g. 'hr_admin', 'department_manager'. */
  roleSlug: string;
  /** Actions on this module to grant the role on first boot. */
  actions: string[];
}

export interface ModuleManifest {
  /** Lowercase identifier — matches the folder name and the prefix on permission keys. */
  key: string;
  /** Display name, used in the settings UI. */
  name: string;
  permissions: PermissionDefinition[];
  navItems?: NavItemDefinition[];
  scheduledJobs?: ScheduledJobDefinition[];
  eventSubscriptions?: EventSubscriptionDefinition[];
  dashboardWidgets?: DashboardWidgetDefinition[];
  approvables?: ApprovableDefinition[];
  settingsPages?: SettingsPageDefinition[];
  /** Prisma model names whose writes generate audit-log entries. */
  auditedEntities?: string[];
  /**
   * Default attachments applied to system roles on boot. Idempotent —
   * re-running upserts. Custom roles created via the admin UI are
   * never touched here.
   */
  defaultRolePermissions?: DefaultRoleAttachment[];
}

/** Helper: derive the full permission key (`<module>:<action>`). */
export function permissionKey(moduleKey: string, action: string): string {
  return `${moduleKey}:${action}`;
}
