'use client';

import { useUser } from './use-user';

export function usePermissions() {
  const { data: user } = useUser();
  const owned = new Set(user?.permissions ?? []);
  return {
    has(key: string): boolean {
      return owned.has(key);
    },
    hasAny(...keys: string[]): boolean {
      return keys.some((k) => owned.has(k));
    },
    hasAll(...keys: string[]): boolean {
      return keys.every((k) => owned.has(k));
    },
  };
}
