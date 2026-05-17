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

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="rounded-fn-sm text-fn-fg-muted hover:bg-fn-bg-inset h-fn-8 w-fn-8 relative flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="h-fn-4 w-fn-4" />
              <span
                aria-hidden
                className="border-fn-bg-panel bg-fn-accent right-fn-1_5 top-fn-1_5 h-fn-1_5 w-fn-1_5 rounded-fn-full absolute border-[1.5px]"
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
