import type { AppUser } from '@/contexts/auth';

export function getFullName(user: AppUser) {
  return `${user.lastName} ${user.middleName} ${user.firstName}`.trim();
}

export function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}
