import { Badge, type BadgeTone } from '@/components/ui/badge';

/**
 * StatusPill — thin wrapper around `<Badge>` that maps an
 * EmployeeStatus slug to the canonical tone. Use this instead of
 * a hand-rolled `<Badge tone="...">` so the tone mapping lives in
 * one place; all label shape / padding / border concerns live on
 * the `<Badge>` primitive itself.
 */
const STATUS_TONE: Record<string, BadgeTone> = {
  permanent: 'success',
  probation: 'warning',
  intern: 'info',
  contractor: 'default',
  'on-leave': 'info',
  terminated: 'danger',
};

export function StatusPill({
  status,
  dot = false,
}: {
  status: { slug: string; name: string };
  dot?: boolean;
}) {
  return (
    <Badge tone={STATUS_TONE[status.slug] ?? 'default'} dot={dot}>
      {status.name}
    </Badge>
  );
}
