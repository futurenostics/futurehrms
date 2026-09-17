'use client';

import * as React from 'react';
import { Combobox } from '@/components/ui/combobox';
import { useEmployeesList } from '@/lib/queries/employees';

/**
 * Lightweight employee typeahead — loads the first 200 active
 * employees (cached via react-query) and lets the Combobox's built-in
 * search filter them client-side. Mirrors the ManagerPicker pattern in
 * employee-form-sheet.tsx.
 */
export interface EmployeePickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function EmployeePicker({
  value,
  onChange,
  placeholder = 'Search employee…',
  disabled,
}: EmployeePickerProps) {
  const list = useEmployeesList({ limit: 200, sortBy: 'fullName', sortDir: 'asc' });

  const options = (list.data?.items ?? [])
    .filter((e) => !e.isArchived)
    .map((e) => ({
      value: e.id,
      label: e.fullName,
      description: `${e.designation.name} · ${e.department.name}`,
    }));

  return (
    <Combobox
      options={options}
      value={value ?? ''}
      onValueChange={(v) => onChange(v || null)}
      placeholder={placeholder}
      searchPlaceholder="Search employee…"
      emptyLabel="employees"
      loading={list.isPending}
      disabled={disabled}
    />
  );
}
