import type { UserOrganizationProfileDto } from '@/features/users/types';

export function getEmptyOrganizationProfile(): UserOrganizationProfileDto {
  return {
    currentRoles: [],
    pastRoles: [],
    divisions: { current: [], past: [] },
    groups: { current: [], past: [] },
    clubs: { current: [], past: [] },
  };
}
