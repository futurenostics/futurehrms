'use client';

import Link from 'next/link';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Compact control that opens a resolved-claims history page. */
export function ShowHistoryButton({ href }: { href: string }) {
  return (
    <Button variant="secondary" size="sm" asChild>
      <Link href={href}>
        <History className="h-fn-3_5 w-fn-3_5" />
        Show history
      </Link>
    </Button>
  );
}
