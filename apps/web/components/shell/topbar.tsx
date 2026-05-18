'use client';

import { ChevronRight, Search } from 'lucide-react';
import { CurrencyToggle } from './currency-toggle';
import { NotificationBell } from './notification-bell';
import { UserMenu } from './user-menu';
import { ThemeToggle } from './theme-toggle';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Topbar({ breadcrumbs }: { breadcrumbs: BreadcrumbItem[] }) {
  return (
    <header className="border-fn-border bg-fn-bg-panel gap-fn-4 px-fn-6 flex h-[52px] shrink-0 items-center border-b">
      <nav aria-label="Breadcrumb" className="gap-fn-1_5 flex items-center text-[13px]">
        {breadcrumbs.map((crumb, i) => {
          const last = i === breadcrumbs.length - 1;
          return (
            <div key={`${crumb.label}-${i}`} className="gap-fn-1_5 flex items-center">
              <span className={cn(last ? 'text-fn-fg font-fn-medium' : 'text-fn-fg-muted')}>
                {crumb.label}
              </span>
              {!last && <ChevronRight className="text-fn-fg-faint h-fn-3_5 w-fn-3_5" />}
            </div>
          );
        })}
      </nav>

      <div className="flex-1" />

      <button
        type="button"
        className="rounded-fn-sm border-fn-border bg-fn-bg-subtle text-fn-fg-muted hover:border-fn-border-strong h-fn-8 w-fn-60 gap-fn-2 px-fn-2_5 hidden items-center border text-[12.5px] sm:flex"
        aria-label="Search"
      >
        <Search className="h-fn-3_5 w-fn-3_5" />
        <span className="flex-1 text-left">Search</span>
        <kbd className="rounded-fn-xs border-fn-border bg-fn-bg-panel text-fn-fg-faint px-fn-1_5 py-fn-0_5 border font-mono text-[10.5px]">
          ⌘K
        </kbd>
      </button>

      <CurrencyToggle />

      <NotificationBell />

      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
