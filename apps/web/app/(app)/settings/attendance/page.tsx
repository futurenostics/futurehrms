'use client';

import * as React from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/use-permissions';
import { ShiftsTab } from '@/components/attendance/shifts-tab';
import { ShiftAssignmentsTab } from '@/components/attendance/shift-assignments-tab';
import { HolidaysTab } from '@/components/attendance/holidays-tab';

type TabKey = 'shifts' | 'assignments' | 'holidays';

export default function AttendanceSettingsPage() {
  const perms = usePermissions();
  const canManageShifts = perms.has('attendance:manage_shifts');
  const canManagePolicies = perms.has('attendance:manage_policies');

  const defaultTab: TabKey = canManageShifts ? 'shifts' : 'holidays';
  const [tab, setTab] = React.useState<TabKey>(defaultTab);

  if (!canManageShifts && !canManagePolicies) {
    return (
      <AppShell breadcrumbs={[{ label: 'Settings' }, { label: 'Attendance' }]}>
        <div className="gap-fn-2 py-fn-16 flex flex-col items-center text-center">
          <p className="text-fn-fg font-fn-semibold text-[14px]">Restricted</p>
          <p className="text-fn-fg-muted max-w-[360px] text-[12.5px]">
            You don&rsquo;t have permission to view attendance settings.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={[{ label: 'Settings' }, { label: 'Attendance' }]}>
      <div className="gap-fn-5 mx-auto flex w-full max-w-[1120px] flex-col">
        <div className="gap-fn-1_5 flex flex-col">
          <h1
            className="text-fn-fg font-fn-semibold text-[22px]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Attendance
          </h1>
          <p className="text-fn-fg-muted max-w-[640px] text-[13px]">
            Shifts, shift assignments, and the company holiday calendar the attendance rule engine
            reads from.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            {canManageShifts && <TabsTrigger value="shifts">Shifts</TabsTrigger>}
            {canManageShifts && <TabsTrigger value="assignments">Shift Assignments</TabsTrigger>}
            {canManagePolicies && <TabsTrigger value="holidays">Holidays</TabsTrigger>}
          </TabsList>

          {canManageShifts && (
            <TabsContent value="shifts">
              <ShiftsTab canManage={canManageShifts} />
            </TabsContent>
          )}
          {canManageShifts && (
            <TabsContent value="assignments">
              <ShiftAssignmentsTab canManage={canManageShifts} />
            </TabsContent>
          )}
          {canManagePolicies && (
            <TabsContent value="holidays">
              <HolidaysTab canManage={canManagePolicies} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppShell>
  );
}
