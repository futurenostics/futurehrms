import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  permanent: 'success',
  probation: 'warning',
  intern: 'info',
  contractor: 'default',
  'on-leave': 'info',
  terminated: 'danger',
};

export function StatusPill({ status }: { status: { slug: string; name: string } }) {
  return <Badge variant={STATUS_VARIANT[status.slug] ?? 'default'}>{status.name}</Badge>;
}
