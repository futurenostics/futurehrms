'use client';

import { useQuery } from '@tanstack/react-query';
import type { AuthUser } from '@futurenostics/types';
import { fetchCurrentUser } from '@/lib/auth';

export function useUser() {
  return useQuery<AuthUser | null>({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
