import type { SportType } from '@/features/sports/types';

export const SPORT_TYPE_OPTIONS = [
  { value: 'badminton', label: 'Cầu lông' },
  { value: 'pickleball', label: 'Pickleball' },
  { value: 'swimming', label: 'Bơi lội' },
] as const satisfies Array<{ value: SportType; label: string }>;

export const DEFAULT_SPORT_TYPE: SportType = 'badminton';

export const SPORT_TYPE_LABELS: Record<SportType, string> = {
  badminton: 'Cầu lông',
  pickleball: 'Pickleball',
  swimming: 'Bơi lội',
};

const SPORT_TYPES = new Set<SportType>(SPORT_TYPE_OPTIONS.map((option) => option.value));

export function isSportType(value: unknown): value is SportType {
  return typeof value === 'string' && SPORT_TYPES.has(value as SportType);
}

export function getSportTypeLabel(type: SportType) {
  return SPORT_TYPE_LABELS[type];
}
