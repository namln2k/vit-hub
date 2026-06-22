import type {
  EventMembershipStatus,
  EventOwnerScopeType,
  EventRoleKey,
  EventVisibility,
  NonEventRoleKey,
} from '@/features/organization-structure/permissions';
import {
  ManageableScopeType,
  OrganizationRoleKey,
} from '@/features/organization-structure/server/adminRepository/types';

export const USER_SELECT =
  'id,email,first_name,last_name,middle_name,nickname,username,phone_number,school_name,enter_year,cohort,gender,avatar_url,avatar_key,role,status';

export function getMembershipTable(scopeType: ManageableScopeType) {
  if (scopeType === 'division') {
    return 'division_memberships';
  }

  if (scopeType === 'group') {
    return 'group_memberships';
  }

  return 'club_memberships';
}

export function getScopeIdColumn(scopeType: ManageableScopeType) {
  if (scopeType === 'division') {
    return 'division_id';
  }

  if (scopeType === 'group') {
    return 'group_id';
  }

  return 'club_id';
}

export function getLeadRoleKey(scopeType: ManageableScopeType): NonEventRoleKey {
  if (scopeType === 'division') {
    return 'division_lead';
  }

  if (scopeType === 'group') {
    return 'group_lead';
  }

  return 'club_lead';
}

export function getDeputyRoleKey(scopeType: ManageableScopeType): NonEventRoleKey {
  if (scopeType === 'division') {
    return 'division_deputy';
  }

  if (scopeType === 'group') {
    return 'group_deputy';
  }

  return 'club_deputy';
}

export function isManageableScopeType(value: unknown): value is ManageableScopeType {
  return value === 'division' || value === 'group' || value === 'club';
}

export function isOrganizationRoleKey(value: unknown): value is OrganizationRoleKey {
  return value === 'captain' || value === 'vice_captain';
}

export function isEventOwnerScopeType(value: unknown): value is EventOwnerScopeType {
  return value === 'organization' || value === 'division' || value === 'group' || value === 'club';
}

export function isEventVisibility(value: unknown): value is EventVisibility {
  return value === 'organization' || value === 'scope' || value === 'managers';
}

export function isEventMembershipStatus(value: unknown): value is EventMembershipStatus {
  return value === 'going' || value === 'checked_in' || value === 'absent';
}

export function isEventRoleKey(value: unknown): value is EventRoleKey {
  return (
    value === 'event_lead' ||
    value === 'event_deputy' ||
    value === 'event_staff_lead' ||
    value === 'event_volunteer'
  );
}
