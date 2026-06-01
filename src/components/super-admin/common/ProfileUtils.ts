import type { UserProfile } from '@/contexts/auth';

export function getFullName(user: UserProfile) {
  return `${user.lastName} ${user.middleName} ${user.firstName}`.trim();
}

export function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}
