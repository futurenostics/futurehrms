import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Users,
  Layers,
  Building2,
  Briefcase,
  Calculator,
  CheckSquare,
  Scale,
  CreditCard,
  Bell,
  Star,
  BarChart3,
  Shield,
  Settings,
} from 'lucide-react';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Optional running count shown in muted text. */
  count?: number;
  /** Notification dot or short label badge. */
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
 * server-side and shipped to the client. For now, every item routes
 * to a path that may 404 until the corresponding screen lands.
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [{ key: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' }],
  },
  {
    label: 'HR Core',
    items: [
      { key: 'employees', label: 'Employees', icon: Users, href: '/employees' },
      { key: 'org', label: 'Org Chart', icon: Layers, href: '/employees/org' },
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
      { key: 'projects', label: 'Projects', icon: Briefcase, href: '/projects' },
      {
        key: 'processing',
        label: 'Monthly Processing',
        icon: Calculator,
        href: '/commissions/processing',
      },
      {
        key: 'approvals',
        label: 'Approvals',
        icon: CheckSquare,
        href: '/commissions/approvals',
      },
      { key: 'rules', label: 'Commission Rules', icon: Scale, href: '/commissions/rules' },
      { key: 'payroll', label: 'Payouts', icon: CreditCard, href: '/payroll' },
    ],
  },
  {
    label: 'Reminders & Reviews',
    items: [
      { key: 'hr-rules', label: 'Reminder Rules', icon: Bell, href: '/hr/rules' },
      { key: 'evaluations', label: 'Evaluations', icon: Star, href: '/hr/evaluations' },
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
