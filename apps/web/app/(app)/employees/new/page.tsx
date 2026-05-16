'use client';

import { AppShell } from '@/components/shell/app-shell';
import { EmployeeForm } from '@/components/employees/employee-form';

export default function NewEmployeePage() {
  return (
    <AppShell breadcrumbs={[{ label: 'HR Core' }, { label: 'Employees' }, { label: 'New' }]}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-fn-fg text-[22px] font-semibold tracking-tight">Add employee</h1>
          <p className="text-fn-fg-muted text-[13px]">
            Create a new employee record. The EID is assigned automatically.
          </p>
        </div>
        <EmployeeForm mode="create" />
      </div>
    </AppShell>
  );
}
