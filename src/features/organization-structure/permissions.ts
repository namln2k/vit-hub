export const USER_STATUSES = ['active', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const SCOPE_TYPES = ['organization', 'division', 'group', 'club', 'event'] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

export const NON_EVENT_SCOPE_TYPES = ['organization', 'division', 'group', 'club'] as const;
export type NonEventScopeType = (typeof NON_EVENT_SCOPE_TYPES)[number];

export const EVENT_OWNER_SCOPE_TYPES = ['organization', 'division', 'group', 'club'] as const;
export type EventOwnerScopeType = (typeof EVENT_OWNER_SCOPE_TYPES)[number];

export const MEMBERSHIP_STATUSES = ['active', 'ended', 'revoked'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const MEMBERSHIP_SOURCES = ['manual', 'role_assignment_auto'] as const;
export type MembershipSource = (typeof MEMBERSHIP_SOURCES)[number];

export const EVENT_MEMBERSHIP_STATUSES = ['going', 'checked_in', 'absent'] as const;
export type EventMembershipStatus = (typeof EVENT_MEMBERSHIP_STATUSES)[number];

export const EVENT_VISIBILITIES = ['organization', 'scope', 'managers'] as const;
export type EventVisibility = (typeof EVENT_VISIBILITIES)[number];

export const DOMAIN_ROLE_KEYS = [
  'captain',
  'vice_captain',
  'division_lead',
  'division_deputy',
  'group_lead',
  'group_deputy',
  'club_lead',
  'club_deputy',
  'event_lead',
  'event_deputy',
  'event_staff_lead',
  'event_volunteer',
] as const;
export type DomainRoleKey = (typeof DOMAIN_ROLE_KEYS)[number];

export const NON_EVENT_ROLE_KEYS = [
  'captain',
  'vice_captain',
  'division_lead',
  'division_deputy',
  'group_lead',
  'group_deputy',
  'club_lead',
  'club_deputy',
] as const;
export type NonEventRoleKey = (typeof NON_EVENT_ROLE_KEYS)[number];

export const EVENT_ROLE_KEYS = [
  'event_lead',
  'event_deputy',
  'event_staff_lead',
  'event_volunteer',
] as const;
export type EventRoleKey = (typeof EVENT_ROLE_KEYS)[number];

export const LEAD_ROLE_KEYS = ['division_lead', 'group_lead', 'club_lead'] as const;
export type LeadRoleKey = (typeof LEAD_ROLE_KEYS)[number];

export const ORGANIZATION_MANAGER_ROLE_KEYS = ['captain', 'vice_captain'] as const;
export type OrganizationManagerRoleKey = (typeof ORGANIZATION_MANAGER_ROLE_KEYS)[number];

export const PERMISSION_KEYS = [
  'scope.member.view_contact',
  'scope.member.manage',
  'scope.role.assign_deputy',
  'scope.role.assign_lead',
  'scope.role.revoke_deputy',
  'scope.role.revoke_lead',
  'event.create',
  'event.view_private',
  'event.manage',
  'event.member.manage',
  'event.role.assign',
  'event.role.revoke',
  'event.attendance.update',
  'permission.view',
  'permission.manage',
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const EFFECT_SCOPES = ['self_scope', 'child_club', 'organization', 'owned_event'] as const;
export type EffectScope = (typeof EFFECT_SCOPES)[number];

export const ROLE_LABELS = {
  captain: 'Đội trưởng',
  vice_captain: 'Đội phó',
  division_lead: 'Mảng trưởng',
  division_deputy: 'Mảng phó',
  group_lead: 'Nhóm trưởng',
  group_deputy: 'Nhóm phó',
  club_lead: 'Chủ nhiệm CLB/tổ trưởng',
  club_deputy: 'Phó chủ nhiệm CLB/tổ phó',
  event_lead: 'Phụ trách event',
  event_deputy: 'Phó phụ trách event',
  event_staff_lead: 'Trưởng staff event',
  event_volunteer: 'Tình nguyện viên event',
} satisfies Record<DomainRoleKey, string>;

export interface ScopeRef {
  type: NonEventScopeType;
  id: string | null;
}

export interface EventOwnerScopeRef {
  type: EventOwnerScopeType;
  id: string | null;
}

export function isOrganizationScope(scope: ScopeRef | EventOwnerScopeRef) {
  return scope.type === 'organization';
}

export function getRoleScopeType(roleKey: NonEventRoleKey): NonEventScopeType {
  if (roleKey === 'captain' || roleKey === 'vice_captain') {
    return 'organization';
  }

  if (roleKey === 'division_lead' || roleKey === 'division_deputy') {
    return 'division';
  }

  if (roleKey === 'group_lead' || roleKey === 'group_deputy') {
    return 'group';
  }

  return 'club';
}

export function getLeadRoleForScope(scopeType: Exclude<NonEventScopeType, 'organization'>) {
  if (scopeType === 'division') {
    return 'division_lead';
  }

  if (scopeType === 'group') {
    return 'group_lead';
  }

  return 'club_lead';
}

export function getDeputyRoleForScope(scopeType: Exclude<NonEventScopeType, 'organization'>) {
  if (scopeType === 'division') {
    return 'division_deputy';
  }

  if (scopeType === 'group') {
    return 'group_deputy';
  }

  return 'club_deputy';
}
