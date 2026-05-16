'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings as SettingsIcon } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { BrandMark } from './brand-mark';
import { navGroups, type NavItem } from './nav-config';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { data: user } = useUser();
  const owned = new Set(user?.permissions ?? []);

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.requires || owned.has(item.requires)),
    }))
    .filter((group) => group.items.length > 0);

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : (user?.email?.[0] ?? 'A').toUpperCase();

  return (
    <aside className="border-fn-border bg-fn-bg-subtle flex w-60 shrink-0 flex-col border-r">
      <div className="flex items-center justify-between px-5 pb-3.5 pt-[18px]">
        <BrandMark />
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            <div className="text-fn-fg-faint px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wider">
              {group.label}
            </div>
            <ul>
              {group.items.map((item) => (
                <li key={item.key}>
                  <SidebarLink item={item} active={isActive(pathname, item.href)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-fn-border flex items-center gap-2.5 border-t px-5 py-3.5">
        <div className="rounded-fn-full bg-fn-accent-soft text-fn-accent-soft-fg flex h-8 w-8 items-center justify-center text-[12px] font-semibold">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-fn-fg truncate text-[13px] font-semibold">
            {user?.fullName ?? user?.email ?? 'Loading…'}
          </div>
          <div className="text-fn-fg-faint text-[11.5px]">
            {user?.roles[0]?.replace(/_/g, ' ') ?? '—'}
          </div>
        </div>
        <SettingsIcon className="text-fn-fg-faint h-3.5 w-3.5" />
      </div>
    </aside>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'relative flex h-10 items-center gap-3 px-[18px] pl-[22px] text-[13.5px] tracking-tight transition-colors',
        active
          ? 'bg-fn-accent-soft text-fn-accent-soft-fg font-semibold'
          : 'text-fn-fg-muted hover:bg-fn-bg-inset hover:text-fn-fg font-medium',
      )}
    >
      {active && (
        <span
          aria-hidden
          className="bg-fn-accent absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r-[3px]"
        />
      )}
      <Icon className={cn('h-[17px] w-[17px] shrink-0', active ? 'opacity-100' : 'opacity-85')} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.count != null && (
        <span className="font-tabular text-fn-fg-faint text-[11px]">{item.count}</span>
      )}
      {item.badge && (
        <span className="bg-fn-accent text-fn-accent-fg rounded-full px-1.5 py-px text-[10.5px] font-semibold leading-tight">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
