'use client';

import { useParams } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { EmployeeForm } from '@/components/employees/employee-form';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployee } from '@/lib/queries/employees';

export default function EditEmployeePage() {
  const params = useParams<{ id: string }>();
  const employeeQuery = useEmployee(params?.id);

  return (
    <AppShell
      breadcrumbs={[
        { label: 'HR Core' },
        { label: 'Employees' },
        { label: employeeQuery.data?.fullName ?? 'Loading…' },
        { label: 'Edit' },
      ]}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-fn-fg text-[22px] font-semibold tracking-tight">
            Edit {employeeQuery.data?.fullName ?? 'employee'}
          </h1>
          <p className="text-fn-fg-muted text-[13px]">
            Status, manager, and salary changes go through their dedicated dialogs on the profile.
          </p>
        </div>
        {employeeQuery.isLoading && <Skeleton className="h-96 w-full" />}
        {employeeQuery.data && <EmployeeForm mode="edit" employee={employeeQuery.data} />}
      </div>
    </AppShell>
  );
}
