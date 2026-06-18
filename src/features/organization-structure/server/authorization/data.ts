import { supabaseFetch } from '@/server/supabase';
import type {
  EventOwnerScopeRef,
  EventRoleKey,
  NonEventRoleKey,
  ScopeRef,
} from '@/features/organization-structure/permissions';
import {
  AuthorizationContext,
  ClubParentRow,
  EventRoleAssignmentRow,
  EventRow,
  PermissionGrantRow,
  RoleAssignmentRow,
} from '@/features/organization-structure/server/authorization/types';
import { isEffectiveActive } from '@/features/organization-structure/server/authorization/matching';

export async function listEffectiveRoleAssignments(userId: string) {
  const query = new URLSearchParams({
    select: 'id,user_id,role_key,scope_type,scope_id,starts_at,ends_at,status',
    user_id: `eq.${userId}`,
    status: 'eq.active',
  });
  const { response, data } = await supabaseFetch<RoleAssignmentRow[]>(
    `/rest/v1/role_assignments?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải role assignments.');
  }

  const now = new Date();
  return (Array.isArray(data) ? data : []).filter((assignment) =>
    isEffectiveActive(assignment, now),
  );
}

export async function listPermissionGrants(roleKeys: Array<NonEventRoleKey | EventRoleKey>) {
  const uniqueRoleKeys = Array.from(new Set(roleKeys));

  if (uniqueRoleKeys.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select: 'role_key,permission_key,effect_scope,is_enabled',
    role_key: `in.(${uniqueRoleKeys.join(',')})`,
    is_enabled: 'eq.true',
  });
  const { response, data } = await supabaseFetch<PermissionGrantRow[]>(
    `/rest/v1/role_permission_grants?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải permission grants.');
  }

  return Array.isArray(data) ? data : [];
}

export async function listEventRoles(eventId: string, userId: string) {
  const query = new URLSearchParams({
    select: 'id,event_id,user_id,role_key',
    event_id: `eq.${eventId}`,
    user_id: `eq.${userId}`,
  });
  const { response, data } = await supabaseFetch<EventRoleAssignmentRow[]>(
    `/rest/v1/event_role_assignments?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải event roles.');
  }

  return Array.isArray(data) ? data : [];
}

export async function getEvent(eventId: string) {
  const query = new URLSearchParams({
    select: 'id,owner_scope_type,owner_scope_id,visibility',
    id: `eq.${eventId}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch<EventRow[]>(`/rest/v1/events?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Không thể tải event.');
  }

  return Array.isArray(data) ? data[0] : null;
}

export async function isActiveScopeMember(
  userId: string,
  targetScope: ScopeRef | EventOwnerScopeRef,
  context: AuthorizationContext = {},
) {
  if (targetScope.type === 'organization') {
    return true;
  }

  const table =
    targetScope.type === 'division'
      ? 'division_memberships'
      : targetScope.type === 'group'
        ? 'group_memberships'
        : 'club_memberships';
  const scopeIdColumn =
    targetScope.type === 'division'
      ? 'division_id'
      : targetScope.type === 'group'
        ? 'group_id'
        : 'club_id';
  const query = new URLSearchParams({
    select: 'id,starts_at,ends_at,status',
    user_id: `eq.${userId}`,
    [scopeIdColumn]: `eq.${targetScope.id}`,
    status: 'eq.active',
    limit: '1',
  });
  const { response, data } = await supabaseFetch<
    Array<{ starts_at: string; ends_at: string | null; status: 'active' | 'ended' | 'revoked' }>
  >(`/rest/v1/${table}?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Không thể kiểm tra membership.');
  }

  const membership = Array.isArray(data) ? data[0] : null;
  return membership ? isEffectiveActive(membership, context.now ?? new Date()) : false;
}

export async function isEventParticipant(userId: string, eventId: string) {
  const query = new URLSearchParams({
    select: 'id',
    event_id: `eq.${eventId}`,
    user_id: `eq.${userId}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch<Array<{ id: string }>>(
    `/rest/v1/event_memberships?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể kiểm tra event participant.');
  }

  return Array.isArray(data) && data.length > 0;
}

export async function getClubParentDivisionId(clubId: string) {
  const query = new URLSearchParams({
    select: 'id,division_id',
    id: `eq.${clubId}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch<ClubParentRow[]>(
    `/rest/v1/clubs?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải CLB/tổ.');
  }

  const club = Array.isArray(data) ? data[0] : null;
  return club ? String(club.division_id) : null;
}
