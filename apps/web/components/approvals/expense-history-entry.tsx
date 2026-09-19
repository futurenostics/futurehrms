'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

/** Quiet history link in the page header. */
export function ShowHistoryButton({ href }: { href: string }) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={href}>History</Link>
    </Button>
  );
}
