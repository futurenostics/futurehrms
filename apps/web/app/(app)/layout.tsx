'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Authenticated shell wrapper.
 *
 * Children render the per-page content; the actual sidebar + topbar are
 * mounted by each page since breadcrumbs vary. This wrapper just gates
 * on auth and shows a skeleton while /me resolves.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, isError } = useUser();

  useEffect(() => {
    if (!isLoading && (!user || isError)) {
      router.replace('/login');
    }
  }, [user, isLoading, isError, router]);

  if (isLoading || !user) {
    return (
      <div className="bg-fn-bg flex min-h-screen w-full items-center justify-center">
        <div className="gap-fn-3 p-fn-6 flex w-full max-w-sm flex-col">
          <Skeleton className="h-fn-4 w-fn-32" />
          <Skeleton className="h-fn-10 w-full" />
          <Skeleton className="h-fn-32 w-full" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
