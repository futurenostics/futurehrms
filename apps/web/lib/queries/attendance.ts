'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

/* ────────────────────────── types ────────────────────────── */

export type PunchStatus =
  | 'present'
  | 'late'
  | 'half_day'
  | 'absent'
  | 'on_leave'
  | 'holiday'
  | 'weekend'
  | 'remote';

export interface AttendanceRecordPublic {
  id: string;
  employeeId: string;
  date: string;
  shiftId: string | null;
  checkIn: string | null;
  checkOut: string | null;
  status: PunchStatus;
  workingHours: number;
  overtimeHours: number;
  overtimeStatus: string;
  penaltyFlags: unknown;
}

export interface PunchInput {
  punchType: 'in' | 'out';
}

export interface ShiftPublic {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  halfDayThresholdMinutes: number;
  breakDurationMinutes: number;
  overtimeType: 'auto' | 'approval_based';
  overtimeThresholdMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftFormInput {
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  halfDayThresholdMinutes: number;
  breakDurationMinutes: number;
  overtimeType: 'auto' | 'approval_based';
  overtimeThresholdMinutes: number;
}

export interface ShiftAssignmentPublic {
  id: string;
  employeeId: string | null;
  departmentId: string | null;
  shiftId: string;
  validFrom: string;
  validTo: string | null;
  assignmentType: 'individual' | 'department';
  priority: number;
  createdAt: string;
}

export interface ShiftAssignmentFormInput {
  employeeId?: string | null;
  departmentId?: string | null;
  shiftId: string;
  validFrom: string;
  validTo?: string | null;
  priority?: number;
}

export interface ShiftAssignmentListQuery {
  employeeId?: string;
  departmentId?: string;
}

export interface HolidayPublic {
  id: string;
  date: string;
  name: string;
  createdAt: string;
}

export interface HolidayFormInput {
  date: string;
  name: string;
}

/* ────────────────────────── query keys ────────────────────────── */

const KEY = {
  today: () => ['attendance', 'today'] as const,
  shifts: () => ['attendance', 'shifts'] as const,
  assignments: (q: ShiftAssignmentListQuery) => ['attendance', 'shift-assignments', q] as const,
  holidays: () => ['attendance', 'holidays'] as const,
};

function invalidateAttendance(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['attendance'] });
}

/* ────────────────────────── punch ────────────────────────── */

export function usePunchToday() {
  return useQuery<{ record: AttendanceRecordPublic | null }>({
    queryKey: KEY.today(),
    queryFn: () => apiFetch('/api/attendance/today'),
  });
}

export function usePunch() {
  const qc = useQueryClient();
  return useMutation<AttendanceRecordPublic, Error, PunchInput>({
    mutationFn: (input) =>
      apiFetch('/api/attendance/punch', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY.today() }),
  });
}

/* ────────────────────────── shifts ────────────────────────── */

export function useShifts() {
  return useQuery<{ items: ShiftPublic[] }>({
    queryKey: KEY.shifts(),
    queryFn: () => apiFetch('/api/attendance/shifts'),
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation<ShiftPublic, Error, ShiftFormInput>({
    mutationFn: (input) =>
      apiFetch('/api/attendance/shifts', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => invalidateAttendance(qc),
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation<ShiftPublic, Error, { id: string; input: Partial<ShiftFormInput> }>({
    mutationFn: ({ id, input }) =>
      apiFetch(`/api/attendance/shifts/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => invalidateAttendance(qc),
  });
}

export function useSetShiftActive() {
  const qc = useQueryClient();
  return useMutation<ShiftPublic, Error, { id: string; isActive: boolean }>({
    mutationFn: ({ id, isActive }) =>
      apiFetch(`/api/attendance/shifts/${id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => invalidateAttendance(qc),
  });
}

/* ────────────────────────── shift assignments ────────────────────────── */

export function useShiftAssignments(query: ShiftAssignmentListQuery = {}) {
  const params = new URLSearchParams();
  if (query.employeeId) params.set('employeeId', query.employeeId);
  if (query.departmentId) params.set('departmentId', query.departmentId);
  const qs = params.toString();
  return useQuery<{ items: ShiftAssignmentPublic[] }>({
    queryKey: KEY.assignments(query),
    queryFn: () => apiFetch(`/api/attendance/shift-assignments${qs ? `?${qs}` : ''}`),
  });
}

export function useCreateShiftAssignment() {
  const qc = useQueryClient();
  return useMutation<ShiftAssignmentPublic, Error, ShiftAssignmentFormInput>({
    mutationFn: (input) =>
      apiFetch('/api/attendance/shift-assignments', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAttendance(qc),
  });
}

export function useUpdateShiftAssignment() {
  const qc = useQueryClient();
  return useMutation<
    ShiftAssignmentPublic,
    Error,
    {
      id: string;
      input: Partial<Pick<ShiftAssignmentFormInput, 'validFrom' | 'validTo' | 'priority'>>;
    }
  >({
    mutationFn: ({ id, input }) =>
      apiFetch(`/api/attendance/shift-assignments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateAttendance(qc),
  });
}

export function useDeleteShiftAssignment() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, string>({
    mutationFn: (id) => apiFetch(`/api/attendance/shift-assignments/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateAttendance(qc),
  });
}

/* ────────────────────────── holidays ────────────────────────── */

export function useHolidays() {
  return useQuery<{ items: HolidayPublic[] }>({
    queryKey: KEY.holidays(),
    queryFn: () => apiFetch('/api/attendance/holidays'),
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation<HolidayPublic, Error, HolidayFormInput>({
    mutationFn: (input) =>
      apiFetch('/api/attendance/holidays', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => invalidateAttendance(qc),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, string>({
    mutationFn: (id) => apiFetch(`/api/attendance/holidays/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateAttendance(qc),
  });
}
