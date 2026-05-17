'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, Settings as SettingsIcon, type LucideIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUser } from '@/hooks/use-user';
import { BrandMark } from './brand-mark';
import { navGroups, type NavItem } from './nav-config';
import { cn } from '@/lib/utils';

const COLLAPSED_STORAGE_KEY = 'fn:sidebar:collapsed';
const WIDTH_EXPANDED = 240;
const WIDTH_COLLAPSED = 64;
const WIDTH_TRANSITION = 'width 0.18s ease';

export function Sidebar() {
  const pathname = usePathname();
  const { data: user } = useUser();

  // Collapse state — default expanded for SSR. We accept a brief layout
  // shift on first paint for users with a persisted collapsed state; if
  // it becomes annoying we'll switch to a cookie hydrated by middleware.
  const [collapsed, setCollapsed] = React.useState(false);
  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true') {
        setCollapsed(true);
      }
    } catch {
      // localStorage can throw under quota/privacy modes — fall back to
      // the expanded default rather than crash.
    }
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // ignore — see above
      }
      return next;
    });
  }, []);

  // Permission-gated nav. Groups are flattened for rendering in this
  // iteration (matches docs/design/shared/chrome.jsx) — group labels
  // stay in the data model for future use but aren't displayed.
  const owned = React.useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);
  const visibleItems = React.useMemo(
    () =>
      navGroups.flatMap((group) =>
        group.items.filter((item) => !item.requires || owned.has(item.requires)),
      ),
    [owned],
  );

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={150}>
      <aside
        aria-label="Primary navigation"
        className="border-fn-border bg-fn-bg-subtle relative flex shrink-0 flex-col border-r"
        style={{
          width: collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED,
          transition: WIDTH_TRANSITION,
        }}
      >
        <CollapseToggle collapsed={collapsed} onClick={toggle} />
        <LogoBlock collapsed={collapsed} />
        <NavList items={visibleItems} pathname={pathname} collapsed={collapsed} />
        <UserBlock user={user} collapsed={collapsed} />
      </aside>
    </TooltipProvider>
  );
}

/* ---------- Collapse toggle ---------- */

function CollapseToggle({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  const Icon = collapsed ? ChevronRight : ChevronLeft;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-expanded={!collapsed}
          className={cn(
            'h-fn-6 w-fn-6 rounded-fn-full absolute z-[2] inline-flex cursor-pointer items-center justify-center',
            'border-fn-border-strong bg-fn-bg-panel text-fn-fg-muted shadow-fn-sm border',
            'hover:bg-fn-bg-subtle hover:text-fn-fg transition-colors',
            'focus-visible:ring-fn-accent focus-visible:ring-offset-fn-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          )}
          style={{ top: 22, right: -12, padding: 0 }}
        >
          <Icon className="h-[13px] w-[13px]" strokeWidth={2.25} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/* ---------- Logo block ---------- */

function LogoBlock({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center overflow-hidden',
        collapsed
          ? 'justify-center px-0 pb-[14px] pt-[18px]'
          : 'justify-between px-[22px] pb-[14px] pt-[18px]',
      )}
    >
      <BrandMark size={18} showWordmark={!collapsed} />
    </div>
  );
}

/* ---------- Nav list ---------- */

function NavList({
  items,
  pathname,
  collapsed,
}: {
  items: NavItem[];
  pathname: string | null;
  collapsed: boolean;
}) {
  return (
    <nav className="py-fn-2 flex-1 overflow-y-auto overflow-x-hidden" aria-label="Sections">
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.key}>
            <NavRow item={item} active={isActive(pathname, item.href)} collapsed={collapsed} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavRow({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  if (collapsed) {
    // The Tooltip's asChild merges Radix props (event handlers, refs,
    // aria-describedby) into the immediate child — that child must be a
    // forwardRef component for the wiring to land on the actual DOM
    // node. RailLink is one (see below); a plain function component
    // would silently drop the handlers and the tooltip would never fire.
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <RailLink item={item} active={active} />
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }
  return <ExpandedLink item={item} active={active} />;
}

function ExpandedLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon: LucideIcon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'h-fn-10 gap-fn-3 relative flex items-center overflow-hidden text-[13.5px] transition-colors duration-100',
        'pl-[22px] pr-[18px]',
        active
          ? 'bg-fn-accent-soft text-fn-accent-soft-fg font-fn-semibold'
          : 'text-fn-fg-muted hover:bg-fn-bg-inset hover:text-fn-fg font-fn-medium',
      )}
      style={{ letterSpacing: '-0.005em' }}
    >
      {active && <ActiveBar />}
      <Icon className={cn('h-[17px] w-[17px] shrink-0', active ? 'opacity-100' : 'opacity-85')} />
      <span className="flex-1 truncate whitespace-nowrap">{item.label}</span>
      {item.count != null && !item.badge && (
        <span className="text-fn-fg-faint text-[11px] tabular-nums">{item.count}</span>
      )}
      {item.badge && (
        <span
          className="bg-fn-accent text-fn-accent-fg rounded-fn-full inline-flex items-center justify-center"
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            lineHeight: 1,
            padding: '1px 6px',
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

type RailLinkProps = { item: NavItem; active: boolean } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
>;

const RailLink = React.forwardRef<HTMLAnchorElement, RailLinkProps>(
  ({ item, active, className, ...rest }, ref) => {
    const Icon: LucideIcon = item.icon;
    return (
      <Link
        ref={ref}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        aria-label={item.label}
        className={cn(
          'h-fn-10 relative flex cursor-pointer items-center justify-center transition-colors duration-100',
          'focus-visible:ring-fn-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
          active
            ? 'bg-fn-accent-soft text-fn-accent-soft-fg'
            : 'text-fn-fg-muted hover:bg-fn-bg-inset hover:text-fn-fg',
          className,
        )}
        {...rest}
      >
        {active && <ActiveBar />}
        <Icon className="h-[18px] w-[18px]" />
        {item.badge && (
          <span
            aria-hidden
            className="bg-fn-accent rounded-fn-full absolute"
            style={{
              top: 6,
              right: 12,
              width: 7,
              height: 7,
              border: '1.5px solid var(--fn-bg-subtle)',
            }}
          />
        )}
      </Link>
    );
  },
);
RailLink.displayName = 'RailLink';

function ActiveBar() {
  return (
    <span
      aria-hidden
      className="bg-fn-accent absolute left-0"
      style={{ top: 6, bottom: 6, width: 3, borderRadius: '0 3px 3px 0' }}
    />
  );
}

/* ---------- User block ---------- */

function UserBlock({
  user,
  collapsed,
}: {
  user: ReturnType<typeof useUser>['data'];
  collapsed: boolean;
}) {
  const initials = computeInitials(user);
  const displayName = user?.fullName ?? user?.email ?? 'Loading…';
  const displayRole = formatRole(user?.roles[0]);

  return (
    <div
      className={cn(
        'border-fn-border flex shrink-0 items-center overflow-hidden border-t',
        collapsed ? 'justify-center px-0 py-[14px]' : 'justify-start px-[22px] py-[14px]',
      )}
      style={{ gap: 10 }}
    >
      {collapsed ? (
        // In rail mode the name + role aren't visible, so the avatar
        // gets a tooltip carrying both pieces of identity on hover or
        // keyboard focus.
        <Tooltip>
          <TooltipTrigger asChild>
            <UserAvatarTrigger initials={initials} ariaLabel={`${displayName} · ${displayRole}`} />
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <div className="gap-fn-0_5 flex flex-col">
              <span className="font-fn-semibold leading-fn-tight text-[12px]">{displayName}</span>
              <span className="text-[11px] opacity-80">{displayRole}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        <>
          <Avatar className="h-fn-8 w-fn-8 shrink-0">
            <AvatarFallback className="font-fn-semibold text-[12px]">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-fn-fg font-fn-semibold truncate whitespace-nowrap text-[13px]">
              {displayName}
            </div>
            <div className="text-fn-fg-faint truncate whitespace-nowrap text-[11.5px]">
              {displayRole}
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                aria-label="Account settings"
                className="text-fn-fg-faint hover:text-fn-fg rounded-fn-xs focus-visible:ring-fn-accent cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2"
              >
                <SettingsIcon className="h-fn-3_5 w-fn-3_5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              Settings
            </TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}

const UserAvatarTrigger = React.forwardRef<
  HTMLButtonElement,
  { initials: string; ariaLabel: string } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ initials, ariaLabel, className, ...rest }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-label={ariaLabel}
    className={cn(
      'rounded-fn-full h-fn-8 w-fn-8 inline-flex cursor-pointer items-center justify-center',
      'focus-visible:ring-fn-accent focus-visible:ring-offset-fn-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      className,
    )}
    {...rest}
  >
    <Avatar className="h-fn-8 w-fn-8 shrink-0">
      <AvatarFallback className="font-fn-semibold text-[12px]">{initials}</AvatarFallback>
    </Avatar>
  </button>
));
UserAvatarTrigger.displayName = 'UserAvatarTrigger';

function computeInitials(user: ReturnType<typeof useUser>['data']): string {
  if (user?.fullName) {
    return user.fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
  return (user?.email?.[0] ?? 'A').toUpperCase();
}

function formatRole(slug: string | undefined): string {
  if (!slug) return '—';
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
