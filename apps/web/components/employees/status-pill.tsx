import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  permanent: 'success',
  probation: 'warning',
  intern: 'info',
  contractor: 'default',
  'on-leave': 'info',
  terminated: 'danger',
};

// Dot color keyed to the variant's accent so the pill reads at a glance
// even before the eye lands on the label.
const STATUS_DOT_COLOR: Record<string, string> = {
  permanent: 'var(--fn-success)',
  probation: 'var(--fn-warning)',
  intern: 'var(--fn-info)',
  contractor: 'var(--fn-fg-muted)',
  'on-leave': 'var(--fn-info)',
  terminated: 'var(--fn-danger)',
};

export function StatusPill({
  status,
  dot = false,
}: {
  status: { slug: string; name: string };
  dot?: boolean;
}) {
  return (
    <Badge variant={STATUS_VARIANT[status.slug] ?? 'default'} className={cn(dot && 'gap-1.5')}>
      {dot && (
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: STATUS_DOT_COLOR[status.slug] ?? 'currentColor' }}
        />
      )}
      {status.name}
    </Badge>
  );
}
