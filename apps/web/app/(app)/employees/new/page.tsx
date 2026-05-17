'use client';

import { AppShell } from '@/components/shell/app-shell';
import { EmployeeForm } from '@/components/employees/employee-form';

export default function NewEmployeePage() {
  return (
    <AppShell breadcrumbs={[{ label: 'HR Core' }, { label: 'Employees' }, { label: 'New' }]}>
      <div className="gap-fn-5 mx-auto flex w-full max-w-4xl flex-col">
        <div className="gap-fn-1 flex flex-col">
          <h1 className="text-fn-fg font-fn-semibold tracking-fn-tight text-[22px]">
            Add employee
          </h1>
          <p className="text-fn-fg-muted text-[13px]">
            Create a new employee record. The EID is assigned automatically.
          </p>
        </div>
        <EmployeeForm mode="create" />
      </div>
    </AppShell>
  );
}
