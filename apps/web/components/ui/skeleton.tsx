import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-fn-sm bg-fn-bg-inset animate-pulse', className)} {...props} />;
}

export { Skeleton };
