'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Bell,
  BellOff,
  CheckCircle2,
  CheckCheck,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
  type NotificationPublic,
} from '@/lib/queries/notifications';

/**
 * Topbar bell. Three jobs:
 *   1. Poll the unread count every 30s — dot only renders when > 0.
 *   2. Open a popover showing the 10 most recent active notifications.
 *   3. Click a row → mark read + navigate to its `link`.
 *
 * Mark-all-read sits at the top of the popover. Empty state shows a
 * "you're all caught up" panel — most users will see this most days,
 * so it matters as a polished surface, not an afterthought.
 */
export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const unread = useUnreadNotificationCount();
  // Only fetch the list when the popover opens to keep idle traffic low.
  const list = useNotifications({ status: 'active', limit: 10 });
  // Force-refresh the list each time the popover opens so the user
  // sees the latest state without waiting for the 30s background poll.
  const refetchList = list.refetch;
  React.useEffect(() => {
    if (open) void refetchList();
  }, [open, refetchList]);

  const count = unread.data?.count ?? 0;
  const showDot = count > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="rounded-fn-sm text-fn-fg-muted hover:bg-fn-bg-inset h-fn-8 w-fn-8 relative flex items-center justify-center"
                aria-label={showDot ? `Notifications (${count} unread)` : 'Notifications'}
              >
                <Bell className="h-fn-4 w-fn-4" />
                {showDot && (
                  <span
                    aria-hidden
                    className={cn(
                      'border-fn-bg-panel bg-fn-accent right-fn-1_5 top-fn-1_5 rounded-fn-full absolute border-[1.5px]',
                      count >= 10
                        ? 'h-fn-3 min-w-fn-3 px-fn-0_5 text-fn-accent-fg font-fn-semibold flex items-center justify-center text-[9px]'
                        : 'h-fn-1_5 w-fn-1_5',
                    )}
                  >
                    {count >= 10 ? (count > 99 ? '99+' : count) : null}
                  </span>
                )}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="rounded-fn-sm border-fn-border bg-fn-bg-panel shadow-fn-popover w-[380px] border p-0"
      >
        <NotificationPopoverBody list={list} unreadCount={count} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

function NotificationPopoverBody({
  list,
  unreadCount,
  onClose,
}: {
  list: ReturnType<typeof useNotifications>;
  unreadCount: number;
  onClose: () => void;
}) {
  const markAll = useMarkAllNotificationsRead();
  const isLoading = list.isPending;
  const items = list.data?.items ?? [];

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="gap-fn-2 border-fn-divider px-fn-3 py-fn-2_5 flex shrink-0 items-center border-b">
        <span className="text-fn-fg font-fn-semibold text-[13px]">Notifications</span>
        {unreadCount > 0 && (
          <span className="text-fn-fg-faint text-[11.5px]">{unreadCount} unread</span>
        )}
        <button
          type="button"
          onClick={() => markAll.mutate()}
          disabled={unreadCount === 0 || markAll.isPending}
          className="text-fn-accent hover:text-fn-accent/80 font-fn-semibold gap-fn-1 ml-auto inline-flex cursor-pointer items-center text-[11.5px] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCheck className="h-fn-3 w-fn-3" />
          Mark all read
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[420px] overflow-y-auto">
        {isLoading ? (
          <SkeletonList />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col">
            {items.map((n) => (
              <NotificationRow key={n.id} notification={n} onAfterClick={onClose} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const SEVERITY_ICON: Record<string, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  danger: AlertCircle,
};
const SEVERITY_TONE: Record<string, string> = {
  info: 'text-fn-info-soft-fg bg-fn-info-soft/60',
  success: 'text-fn-success-soft-fg bg-fn-success-soft/60',
  warning: 'text-fn-warning-soft-fg bg-fn-warning-soft/60',
  danger: 'text-fn-danger-soft-fg bg-fn-danger-soft/60',
};

function NotificationRow({
  notification,
  onAfterClick,
}: {
  notification: NotificationPublic;
  onAfterClick: () => void;
}) {
  const router = useRouter();
  const markRead = useMarkNotificationRead();
  const Icon = SEVERITY_ICON[notification.severity] ?? Info;
  const tone = SEVERITY_TONE[notification.severity] ?? SEVERITY_TONE.info!;
  const unread = notification.status === 'unread';

  function handleClick() {
    if (unread) markRead.mutate(notification.id);
    if (notification.link) {
      router.push(notification.link);
    }
    onAfterClick();
  }

  return (
    <li className="border-fn-divider border-b last:border-b-0">
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'gap-fn-2_5 px-fn-3 py-fn-2_5 hover:bg-fn-bg-inset/60 flex w-full cursor-pointer items-start text-left transition-colors',
          unread && 'bg-fn-accent-soft/15',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'rounded-fn-xs h-fn-7 w-fn-7 inline-flex shrink-0 items-center justify-center',
            tone,
          )}
        >
          <Icon className="h-fn-3_5 w-fn-3_5" />
        </span>
        <div className="gap-fn-0_5 flex min-w-0 flex-1 flex-col">
          <div className="gap-fn-1_5 flex items-center">
            <span
              className={cn(
                'flex-1 truncate text-[12.5px]',
                unread ? 'text-fn-fg font-fn-semibold' : 'text-fn-fg-muted font-fn-medium',
              )}
            >
              {notification.title}
            </span>
            {unread && (
              <span
                aria-hidden
                className="bg-fn-accent h-fn-1_5 w-fn-1_5 rounded-fn-full shrink-0"
              />
            )}
          </div>
          <span className="text-fn-fg-faint leading-fn-tight line-clamp-2 text-[11.5px]">
            {notification.body}
          </span>
          <span className="text-fn-fg-faint mt-fn-0_5 text-[10.5px]">
            {formatRelative(notification.createdAt)}
          </span>
        </div>
      </button>
    </li>
  );
}

function SkeletonList() {
  return (
    <div className="gap-fn-2 px-fn-3 py-fn-3 flex flex-col">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="gap-fn-2_5 flex items-start">
          <Skeleton className="h-fn-7 w-fn-7 rounded-fn-xs" />
          <div className="gap-fn-1 flex flex-1 flex-col">
            <Skeleton className="h-fn-3 w-[60%]" />
            <Skeleton className="h-fn-3 w-[85%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="gap-fn-2 py-fn-8 px-fn-4 flex flex-col items-center text-center">
      <span
        aria-hidden
        className="rounded-fn-full bg-fn-bg-inset text-fn-fg-faint h-fn-10 w-fn-10 inline-flex items-center justify-center"
      >
        <BellOff className="h-fn-4 w-fn-4" />
      </span>
      <p className="text-fn-fg font-fn-semibold text-[12.5px]">You’re all caught up</p>
      <p className="text-fn-fg-muted max-w-[260px] text-[11.5px]">
        Notifications about your commission runs, approvals, and reminders will land here.
      </p>
    </div>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.max(1, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
