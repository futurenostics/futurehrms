import { ModuleManifest } from '../../core/registry/types';

export const benefitsManifest: ModuleManifest = {
  key: 'benefits',
  name: 'Benefit policies',
  permissions: [
    {
      action: 'manage_policies',
      description: 'Publish company-wide OPD and gym allowance amounts',
    },
  ],
  navItems: [
    {
      label: 'Benefit policies',
      path: '/settings/benefit-policies',
      icon: 'HeartPulse',
      requires: 'benefits:manage_policies',
      group: 'Settings',
      order: 20,
    },
  ],
  settingsPages: [
    {
      key: 'benefit-policies',
      label: 'Benefit policies',
      path: '/settings/benefit-policies',
      requires: 'benefits:manage_policies',
      group: 'Settings',
      order: 20,
    },
  ],
  eventSubscriptions: [{ event: 'employee.created', handler: 'onEmployeeCreated' }],
  auditedEntities: ['BenefitPolicy', 'EmployeeBenefitBalance', 'BenefitLedgerEntry'],
  defaultRolePermissions: [{ roleSlug: 'hr_admin', actions: ['manage_policies'] }],
};
