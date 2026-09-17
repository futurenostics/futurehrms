import type { BadgeTone } from '@/components/ui/badge';
import type { PunchStatus } from '@/lib/queries/attendance';

/**
 * Shared status → Badge tone/label map. Lifted out of punch-widget.tsx
 * so the dashboard widget and the Portal Attendance history tab render
 * the exact same tones for the same status.
 */
export const ATTENDANCE_STATUS_TONE: Record<PunchStatus, BadgeTone> = {
  present: 'success',
  late: 'warning',
  half_day: 'warning',
  absent: 'danger',
  on_leave: 'info',
  holiday: 'default',
  weekend: 'default',
  remote: 'accent',
};

export const ATTENDANCE_STATUS_LABEL: Record<PunchStatus, string> = {
  present: 'Present',
  late: 'Late',
  half_day: 'Half day',
  absent: 'Absent',
  on_leave: 'On leave',
  holiday: 'Holiday',
  weekend: 'Weekend',
  remote: 'Remote',
};

export function attendanceTimeLabel(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
