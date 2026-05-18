import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BellRing,
  Briefcase,
  Building2,
  Calculator,
  CheckSquare,
  CreditCard,
  Home,
  Network,
  Scale,
  Settings,
  Shield,
  Star,
  Users,
} from 'lucide-react';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Static numeric counter shown in muted text on the right (e.g. employee count). */
  count?: number;
  /** Short attention badge ("2", "4") that becomes a dot in rail mode. */
  badge?: string;
  /** Permission key — when set, the item only renders for users with the perm. */
  requires?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Static nav for Phase 0. Domain modules will register their own items
 * via the manifest in later phases — this list will then be assembled
 * from the registry and shipped to the client. Until then every item
 * routes to a path that may 404 until the corresponding screen lands.
 *
 * TODO: counts (84, 23) and badges (2, 4) are placeholder values from
 * the design mockup. Wire them to real per-user data once the Employees
 * and Approvals modules expose count endpoints.
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [{ key: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' }],
  },
  {
    label: 'HR Core',
    items: [
      { key: 'employees', label: 'Employees', icon: Users, href: '/employees', count: 84 },
      { key: 'org', label: 'Org Chart', icon: Network, href: '/org-chart' },
      {
        key: 'departments',
        label: 'Departments',
        icon: Building2,
        href: '/settings/departments',
        requires: 'settings:departments:view',
      },
    ],
  },
  {
    label: 'Commission & Payroll',
    items: [
      { key: 'projects', label: 'Projects', icon: Briefcase, href: '/projects', count: 23 },
      {
        key: 'processing',
        label: 'Monthly Processing',
        icon: Calculator,
        href: '/monthly-processing',
      },
      {
        key: 'approvals',
        label: 'Approvals',
        icon: CheckSquare,
        href: '/commissions/approvals',
        badge: '2',
      },
      { key: 'rules', label: 'Commission Rules', icon: Scale, href: '/commission-rules' },
      { key: 'payroll', label: 'Payouts', icon: CreditCard, href: '/payroll' },
    ],
  },
  {
    label: 'Reminders & Reviews',
    items: [
      {
        key: 'reminder-rules',
        label: 'Reminder Rules',
        icon: BellRing,
        href: '/settings/reminder-rules',
        requires: 'reminders:view_rules',
      },
      {
        key: 'evaluations',
        label: 'Evaluations',
        icon: Star,
        href: '/hr/evaluations',
        badge: '4',
      },
      { key: 'reports', label: 'Reports', icon: BarChart3, href: '/reports' },
    ],
  },
  {
    label: 'Settings',
    items: [
      {
        key: 'roles',
        label: 'Roles & Permissions',
        icon: Shield,
        href: '/settings/roles',
        requires: 'settings:roles:view',
      },
      { key: 'general', label: 'General', icon: Settings, href: '/settings' },
    ],
  },
];
