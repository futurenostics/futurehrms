'use client';

import { Bell, ChevronRight, Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CurrencyToggle } from './currency-toggle';
import { UserMenu } from './user-menu';
import { ThemeToggle } from './theme-toggle';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Topbar({ breadcrumbs }: { breadcrumbs: BreadcrumbItem[] }) {
  return (
    <header className="border-fn-border bg-fn-bg-panel flex h-[52px] shrink-0 items-center gap-4 border-b px-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px]">
        {breadcrumbs.map((crumb, i) => {
          const last = i === breadcrumbs.length - 1;
          return (
            <div key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
              <span className={cn(last ? 'text-fn-fg font-medium' : 'text-fn-fg-muted')}>
                {crumb.label}
              </span>
              {!last && <ChevronRight className="text-fn-fg-faint h-3.5 w-3.5" />}
            </div>
          );
        })}
      </nav>

      <div className="flex-1" />

      <button
        type="button"
        className="rounded-fn-sm border-fn-border bg-fn-bg-subtle text-fn-fg-muted hover:border-fn-border-strong hidden h-8 w-60 items-center gap-2 border px-2.5 text-[12.5px] sm:flex"
        aria-label="Search"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search</span>
        <kbd className="rounded-fn-xs border-fn-border bg-fn-bg-panel text-fn-fg-faint border px-1.5 py-0.5 font-mono text-[10.5px]">
          ⌘K
        </kbd>
      </button>

      <CurrencyToggle />

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="rounded-fn-sm text-fn-fg-muted hover:bg-fn-bg-inset relative flex h-8 w-8 items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span
                aria-hidden
                className="border-fn-bg-panel bg-fn-accent absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full border-[1.5px]"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
