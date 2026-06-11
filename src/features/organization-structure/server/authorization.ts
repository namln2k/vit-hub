import { getBearerToken, jsonResponse } from '@/server/api';
import { getSupabaseUid, supabaseFetch } from '@/server/supabase';
import type { UserRole } from '@/constants/userRoles';
import type {
  EffectScope,
  EventOwnerScopeRef,
  EventRoleKey,
  NonEventRoleKey,
  NonEventScopeType,
  PermissionKey,
  ScopeRef,
  UserStatus,
} from '@/features/organization-structure/permissions';

interface ActorUserRow {
  id: string;
  role: UserRole;
  status: UserStatus;
}

interface RoleAssignmentRow {
  id: string;
  user_id: string;
  role_key: NonEventRoleKey;
  scope_type: NonEventScopeType;
  scope_id: string | null;
  starts_at: string;
  ends_at: string | null;
  status: 'active' | 'ended' | 'revoked';
}

interface EventRoleAssignmentRow {
  id: string;
  event_id: string;
  user_id: string;
  role_key: EventRoleKey;
}

interface PermissionGrantRow {
  role_key: NonEventRoleKey | EventRoleKey;
  permission_key: PermissionKey;
  effect_scope: EffectScope;
  is_enabled: boolean;
}

interface ClubParentRow {
  id: string;
  division_id: string;
}

interface EventRow {
  id: string;
  owner_scope_type: EventOwnerScopeRef['type'];
  owner_scope_id: string | null;
}

export interface OrganizationActor {
  id: string;
  appRole: UserRole;
  status: UserStatus;
  roleAssignments: RoleAssignmentRow[];
}

export interface AuthorizationContext {
  now?: Date;
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 | 404 | 409 = 403,
  ) {
    super(message);
  }
}

export async function requireOrganizationActor(request: Request): Promise<OrganizationActor> {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    throw new AuthorizationError('Missing Supabase access token.', 401);
  }

  const uid = await getSupabaseUid(accessToken);

  if (!uid) {
    throw new AuthorizationError('Invalid Supabase access token.', 401);
  }

  return getOrganizationActor(uid);
}

export async function getOrganizationActor(userId: string): Promise<OrganizationActor> {
  const userQuery = new URLSearchParams({
    select: 'id,role,status',
    id: `eq.${userId}`,
    limit: '1',
  });
  const { response: userResponse, data: userData } = await supabaseFetch<ActorUserRow[]>(
    `/rest/v1/user?${userQuery.toString()}`,
  );

  if (!userResponse.ok) {
    throw new Error('Không thể tải thông tin người dùng.');
  }

  const user = Array.isArray(userData) ? userData[0] : null;

  if (!user) {
    throw new AuthorizationError('Không tìm thấy người dùng.', 401);
  }

  if (user.status !== 'active') {
    throw new AuthorizationError('Tài khoản đã bị vô hiệu hóa.', 403);
  }

  const roleAssignments = await listEffectiveRoleAssignments(user.id);

  return {
    id: user.id,
    appRole: user.role,
    status: user.status,
    roleAssignments,
  };
}

export function isSuperAdmin(actor: OrganizationActor) {
  return actor.appRole === 'super_admin';
}

export function isOrganizationManager(actor: OrganizationActor) {
  if (isSuperAdmin(actor)) {
    return true;
  }

  return actor.roleAssignments.some(
    (assignment) =>
      assignment.scope_type === 'organization' &&
      (assignment.role_key === 'captain' || assignment.role_key === 'vice_captain'),
  );
}

export async function hasDomainPermission(
  actor: OrganizationActor,
  permissionKey: PermissionKey,
  targetScope: ScopeRef,
  context: AuthorizationContext = {},
) {
  if (isSuperAdmin(actor)) {
    return true;
  }

  const grants = await listPermissionGrants(
    actor.roleAssignments.map((assignment) => assignment.role_key),
  );
  const now = context.now ?? new Date();
  const targetParentDivisionId =
    targetScope.type === 'club' ? await getClubParentDivisionId(String(targetScope.id)) : null;

  for (const assignment of actor.roleAssignments) {
    if (!isEffectiveActive(assignment, now)) {
      continue;
    }

    const matchingGrants = grants.filter(
      (grant) =>
        grant.role_key === assignment.role_key &&
        grant.permission_key === permissionKey &&
        grant.is_enabled,
    );

    if (
      matchingGrants.some((grant) =>
        grantMatchesScope({
          grant,
          assignment,
          targetScope,
          targetParentDivisionId,
        }),
      )
    ) {
      return true;
    }
  }

  return false;
}

export async function canManageScope(
  actor: OrganizationActor,
  targetScope: ScopeRef,
  context: AuthorizationContext = {},
) {
  if (isSuperAdmin(actor)) {
    return true;
  }

  return hasDomainPermission(actor, 'scope.member.manage', targetScope, context);
}

export async function canCreateEventForOwner(
  actor: OrganizationActor,
  ownerScope: EventOwnerScopeRef,
  context: AuthorizationContext = {},
) {
  if (isSuperAdmin(actor)) {
    return true;
  }

  return hasDomainPermission(actor, 'event.create', ownerScope, context);
}

export async function canManageEvent(
  actor: OrganizationActor,
  eventId: string,
  context: AuthorizationContext = {},
) {
  if (isSuperAdmin(actor)) {
    return true;
  }

  const event = await getEvent(eventId);

  if (!event) {
    throw new AuthorizationError('Không tìm thấy event.', 404);
  }

  const eventRoles = await listEventRoles(eventId, actor.id);
  const grants = await listPermissionGrants(eventRoles.map((assignment) => assignment.role_key));
  const hasEventManagerRole = eventRoles.some((assignment) =>
    grants.some(
      (grant) =>
        grant.role_key === assignment.role_key &&
        grant.permission_key === 'event.manage' &&
        grant.effect_scope === 'owned_event' &&
        grant.is_enabled,
    ),
  );

  if (hasEventManagerRole) {
    return true;
  }

  return hasDomainPermission(
    actor,
    'event.manage',
    {
      type: event.owner_scope_type,
      id: event.owner_scope_id,
    },
    context,
  );
}

export function authorizationErrorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return jsonResponse({ error: error.message }, error.status);
  }

  return null;
}

async function listEffectiveRoleAssignments(userId: string) {
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

async function listPermissionGrants(roleKeys: Array<NonEventRoleKey | EventRoleKey>) {
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

async function listEventRoles(eventId: string, userId: string) {
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

async function getEvent(eventId: string) {
  const query = new URLSearchParams({
    select: 'id,owner_scope_type,owner_scope_id',
    id: `eq.${eventId}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch<EventRow[]>(`/rest/v1/events?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Không thể tải event.');
  }

  return Array.isArray(data) ? data[0] : null;
}

async function getClubParentDivisionId(clubId: string) {
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

function isEffectiveActive(
  row: Pick<RoleAssignmentRow, 'status' | 'starts_at' | 'ends_at'>,
  now: Date,
) {
  if (row.status !== 'active') {
    return false;
  }

  const startsAt = new Date(row.starts_at);
  const endsAt = row.ends_at ? new Date(row.ends_at) : null;

  return startsAt <= now && (!endsAt || now < endsAt);
}

function grantMatchesScope({
  grant,
  assignment,
  targetScope,
  targetParentDivisionId,
}: {
  grant: PermissionGrantRow;
  assignment: RoleAssignmentRow;
  targetScope: ScopeRef | EventOwnerScopeRef;
  targetParentDivisionId: string | null;
}) {
  if (grant.effect_scope === 'organization') {
    return true;
  }

  if (grant.effect_scope === 'self_scope') {
    return assignment.scope_type === targetScope.type && assignment.scope_id === targetScope.id;
  }

  if (grant.effect_scope === 'owned_event') {
    return false;
  }

  if (grant.effect_scope === 'child_club') {
    return (
      targetScope.type === 'club' &&
      assignment.scope_type === 'division' &&
      assignment.scope_id === targetParentDivisionId
    );
  }

  return false;
}

export async function canManageChildClub(
  actor: OrganizationActor,
  clubId: string,
  permissionKey: PermissionKey,
  context: AuthorizationContext = {},
) {
  return hasDomainPermission(actor, permissionKey, { type: 'club', id: clubId }, context);
}
