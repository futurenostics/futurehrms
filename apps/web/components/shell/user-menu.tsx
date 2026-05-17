'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/hooks/use-user';
import { logout } from '@/lib/auth';

export function UserMenu() {
  const { data: user } = useUser();
  const router = useRouter();
  const qc = useQueryClient();

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
    : (user?.email?.[0] ?? 'A').toUpperCase();

  async function handleLogout() {
    await logout();
    qc.clear();
    toast.success('Signed out.');
    router.replace('/login');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-fn-full bg-fn-accent-soft text-fn-accent-soft-fg hover:bg-fn-accent-soft/80 h-fn-8 w-fn-8 font-fn-semibold flex items-center justify-center text-[12px]"
          aria-label="Account menu"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fn-56">
        <DropdownMenuLabel>
          <div className="space-y-fn-0_5 tracking-fn-normal normal-case">
            <div className="text-fn-fg font-fn-semibold text-[13px]">
              {user?.fullName ?? user?.email ?? 'Account'}
            </div>
            {user?.email && (
              <div className="text-fn-fg-muted font-fn-normal text-[11.5px]">{user.email}</div>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserIcon /> Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
