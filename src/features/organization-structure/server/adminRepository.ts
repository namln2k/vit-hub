import { supabaseFetch } from '@/server/supabase';
import type { UserRole } from '@/constants/userRoles';
import type {
  DomainRoleKey,
  EffectScope,
  NonEventRoleKey,
  PermissionKey,
} from '@/features/organization-structure/permissions';

export type ManageableScopeType = 'division' | 'group';

interface MembershipRow {
  id: string;
  user_id: string;
  starts_at: string;
  ends_at: string | null;
  status: 'active' | 'ended' | 'revoked';
  source: 'manual' | 'role_assignment_auto';
}

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  nickname: string | null;
  username: string;
  phone_number: string | null;
  school_name: string | null;
  enter_year: string | null;
  cohort: string | null;
  gender: 0 | 1 | null;
  avatar_url: string | null;
  avatar_key: string | null;
  role: UserRole;
  status: 'active' | 'disabled';
}

export interface RoleAssignmentSummary {
  id: string;
  userId: string;
  roleKey: NonEventRoleKey;
  scopeType: 'organization' | ManageableScopeType | 'club';
  scopeId: string | null;
  startsAt: string;
  endsAt: string | null;
  status: 'active' | 'ended' | 'revoked';
}

interface RoleAssignmentRow {
  id: string;
  user_id: string;
  role_key: NonEventRoleKey;
  scope_type: RoleAssignmentSummary['scopeType'];
  scope_id: string | null;
  starts_at: string;
  ends_at: string | null;
  status: 'active' | 'ended' | 'revoked';
}

interface RoleRow {
  key: DomainRoleKey;
  scope_type: string;
  label: string;
}

interface PermissionRow {
  key: PermissionKey;
  label: string;
  description: string;
}

interface PermissionGrantRow {
  role_key: DomainRoleKey;
  permission_key: PermissionKey;
  effect_scope: EffectScope;
  is_enabled: boolean;
  updated_at: string;
}

export interface OrganizationMemberSummary {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  nickname: string;
  username: string;
  phoneNumber: string;
  schoolName: string;
  enterYear: string;
  cohort: string;
  gender: 0 | 1 | null;
  avatarUrl: string;
  avatarKey: string;
  role: UserRole;
  status: 'active' | 'disabled';
  membership: {
    id: string;
    startsAt: string;
    endsAt: string | null;
    status: 'active' | 'ended' | 'revoked';
    source: 'manual' | 'role_assignment_auto';
  };
  roleAssignments: RoleAssignmentSummary[];
}

export interface PermissionMatrix {
  roles: Array<{ key: DomainRoleKey; scopeType: string; label: string }>;
  permissions: Array<{ key: PermissionKey; label: string; description: string }>;
  grants: Array<{
    roleKey: DomainRoleKey;
    permissionKey: PermissionKey;
    effectScope: EffectScope;
    isEnabled: boolean;
    updatedAt: string;
  }>;
}

const USER_SELECT =
  'id,email,first_name,last_name,middle_name,nickname,username,phone_number,school_name,enter_year,cohort,gender,avatar_url,avatar_key,role,status';

export function getMembershipTable(scopeType: ManageableScopeType) {
  return scopeType === 'division' ? 'division_memberships' : 'group_memberships';
}

export function getScopeIdColumn(scopeType: ManageableScopeType) {
  return scopeType === 'division' ? 'division_id' : 'group_id';
}

export function getLeadRoleKey(scopeType: ManageableScopeType): NonEventRoleKey {
  return scopeType === 'division' ? 'division_lead' : 'group_lead';
}

export function getDeputyRoleKey(scopeType: ManageableScopeType): NonEventRoleKey {
  return scopeType === 'division' ? 'division_deputy' : 'group_deputy';
}

export function isManageableScopeType(value: unknown): value is ManageableScopeType {
  return value === 'division' || value === 'group';
}

export async function listScopeMembers(scopeType: ManageableScopeType, scopeId: string) {
  const table = getMembershipTable(scopeType);
  const scopeIdColumn = getScopeIdColumn(scopeType);
  const membershipQuery = new URLSearchParams({
    select: 'id,user_id,starts_at,ends_at,status,source',
    [scopeIdColumn]: `eq.${scopeId}`,
    status: 'eq.active',
    order: 'starts_at.desc',
  });
  const { response: membershipResponse, data: membershipData } = await supabaseFetch<
    MembershipRow[]
  >(`/rest/v1/${table}?${membershipQuery.toString()}`);

  if (!membershipResponse.ok) {
    throw new Error('Không thể tải memberships.');
  }

  const memberships = Array.isArray(membershipData) ? membershipData : [];
  const userIds = memberships.map((membership) => membership.user_id);

  if (userIds.length === 0) {
    return [];
  }

  const [users, roleAssignments] = await Promise.all([
    listUsersByIds(userIds),
    listScopeRoleAssignments(scopeType, scopeId, userIds),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const rolesByUserId = new Map<string, RoleAssignmentSummary[]>();

  for (const assignment of roleAssignments) {
    const userRoles = rolesByUserId.get(assignment.userId) ?? [];
    userRoles.push(assignment);
    rolesByUserId.set(assignment.userId, userRoles);
  }

  return memberships
    .map((membership) => {
      const user = usersById.get(membership.user_id);

      if (!user) {
        return null;
      }

      return {
        ...mapUserRow(user),
        membership: {
          id: membership.id,
          startsAt: membership.starts_at,
          endsAt: membership.ends_at,
          status: membership.status,
          source: membership.source,
        },
        roleAssignments: rolesByUserId.get(user.id) ?? [],
      } satisfies OrganizationMemberSummary;
    })
    .filter((member): member is OrganizationMemberSummary => Boolean(member))
    .sort((first, second) => getUserSortName(first).localeCompare(getUserSortName(second)));
}

export async function addScopeMembers({
  actorId,
  scopeType,
  scopeId,
  userIds,
  source = 'manual',
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  userIds: string[];
  source?: 'manual' | 'role_assignment_auto';
}) {
  const uniqueUserIds = Array.from(new Set(userIds));

  if (uniqueUserIds.length === 0) {
    return;
  }

  const users = await listUsersByIds(uniqueUserIds);
  const disabledUser = users.find((user) => user.status !== 'active');

  if (disabledUser) {
    throw new Error(`Không thể thêm user đã bị vô hiệu hóa: ${disabledUser.email}.`);
  }

  const existingIds = new Set(
    (await listScopeMembers(scopeType, scopeId)).map((member) => member.uid),
  );
  const rows = uniqueUserIds
    .filter((userId) => !existingIds.has(userId))
    .map((userId) => ({
      [getScopeIdColumn(scopeType)]: scopeId,
      user_id: userId,
      starts_at: new Date().toISOString(),
      status: 'active',
      source,
      added_by: actorId,
    }));

  if (rows.length === 0) {
    return;
  }

  const { response, data } = await supabaseFetch(`/rest/v1/${getMembershipTable(scopeType)}`, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: rows,
  });

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể thêm thành viên.'));
  }
}

export async function endScopeMembers({
  actorId,
  scopeType,
  scopeId,
  userIds,
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  userIds: string[];
}) {
  const uniqueUserIds = Array.from(new Set(userIds));

  if (uniqueUserIds.length === 0) {
    return;
  }

  const endedAt = new Date().toISOString();
  const query = new URLSearchParams({
    [getScopeIdColumn(scopeType)]: `eq.${scopeId}`,
    user_id: `in.(${uniqueUserIds.join(',')})`,
    status: 'eq.active',
  });
  const { response, data } = await supabaseFetch(
    `/rest/v1/${getMembershipTable(scopeType)}?${query.toString()}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: {
        status: 'ended',
        ends_at: endedAt,
        ended_by: actorId,
        updated_at: endedAt,
      },
    },
  );

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể kết thúc membership.'));
  }

  await endScopeRoleAssignments({
    actorId,
    scopeType,
    scopeId,
    userIds: uniqueUserIds,
    roleKeys: [getLeadRoleKey(scopeType), getDeputyRoleKey(scopeType)],
    endedAt,
  });
}

export async function assignScopeRole({
  actorId,
  scopeType,
  scopeId,
  userId,
  roleKey,
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  userId: string;
  roleKey: NonEventRoleKey;
}) {
  await addScopeMembers({
    actorId,
    scopeType,
    scopeId,
    userIds: [userId],
    source: 'role_assignment_auto',
  });

  if (roleKey === getLeadRoleKey(scopeType)) {
    await endScopeRoleAssignments({
      actorId,
      scopeType,
      scopeId,
      userIds: [],
      roleKeys: [roleKey],
      endedAt: new Date().toISOString(),
    });
  }

  const activeAssignments = await listScopeRoleAssignments(scopeType, scopeId, [userId]);
  const existingAssignment = activeAssignments.find((assignment) => assignment.roleKey === roleKey);

  if (existingAssignment) {
    return;
  }

  const { response, data } = await supabaseFetch('/rest/v1/role_assignments', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      user_id: userId,
      role_key: roleKey,
      scope_type: scopeType,
      scope_id: scopeId,
      starts_at: new Date().toISOString(),
      status: 'active',
      assigned_by: actorId,
    },
  });

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể bổ nhiệm vai trò.'));
  }
}

export async function endScopeRoleAssignments({
  actorId,
  scopeType,
  scopeId,
  userIds,
  roleKeys,
  endedAt = new Date().toISOString(),
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  userIds: string[];
  roleKeys: NonEventRoleKey[];
  endedAt?: string;
}) {
  const query = new URLSearchParams({
    scope_type: `eq.${scopeType}`,
    scope_id: `eq.${scopeId}`,
    role_key: `in.(${roleKeys.join(',')})`,
    status: 'eq.active',
  });

  if (userIds.length > 0) {
    query.set('user_id', `in.(${Array.from(new Set(userIds)).join(',')})`);
  }

  const { response, data } = await supabaseFetch(`/rest/v1/role_assignments?${query.toString()}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: {
      status: 'ended',
      ends_at: endedAt,
      ended_by: actorId,
      updated_at: endedAt,
    },
  });

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể gỡ vai trò.'));
  }
}

export async function listPermissionMatrix(): Promise<PermissionMatrix> {
  const [rolesResult, permissionsResult, grantsResult] = await Promise.all([
    supabaseFetch<RoleRow[]>('/rest/v1/roles?select=key,scope_type,label&order=scope_type.asc'),
    supabaseFetch<PermissionRow[]>(
      '/rest/v1/permissions?select=key,label,description&order=key.asc',
    ),
    supabaseFetch<PermissionGrantRow[]>(
      '/rest/v1/role_permission_grants?select=role_key,permission_key,effect_scope,is_enabled,updated_at&order=role_key.asc',
    ),
  ]);

  if (!rolesResult.response.ok || !permissionsResult.response.ok || !grantsResult.response.ok) {
    throw new Error('Không thể tải permission matrix.');
  }

  return {
    roles: (Array.isArray(rolesResult.data) ? rolesResult.data : []).map((role) => ({
      key: role.key,
      scopeType: role.scope_type,
      label: role.label,
    })),
    permissions: (Array.isArray(permissionsResult.data) ? permissionsResult.data : []).map(
      (permission) => ({
        key: permission.key,
        label: permission.label,
        description: permission.description,
      }),
    ),
    grants: (Array.isArray(grantsResult.data) ? grantsResult.data : []).map((grant) => ({
      roleKey: grant.role_key,
      permissionKey: grant.permission_key,
      effectScope: grant.effect_scope,
      isEnabled: grant.is_enabled,
      updatedAt: grant.updated_at,
    })),
  };
}

export async function updatePermissionGrant({
  actorId,
  roleKey,
  permissionKey,
  effectScope,
  isEnabled,
}: {
  actorId: string;
  roleKey: DomainRoleKey;
  permissionKey: PermissionKey;
  effectScope: EffectScope;
  isEnabled: boolean;
}) {
  const query = new URLSearchParams({
    role_key: `eq.${roleKey}`,
    permission_key: `eq.${permissionKey}`,
    effect_scope: `eq.${effectScope}`,
  });
  const { response, data } = await supabaseFetch(
    `/rest/v1/role_permission_grants?${query.toString()}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: {
        is_enabled: isEnabled,
        updated_by: actorId,
        updated_at: new Date().toISOString(),
      },
    },
  );

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể cập nhật permission grant.'));
  }
}

async function listUsersByIds(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds));

  if (uniqueUserIds.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select: USER_SELECT,
    id: `in.(${uniqueUserIds.join(',')})`,
  });
  const { response, data } = await supabaseFetch<UserRow[]>(`/rest/v1/user?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Không thể tải thông tin người dùng.');
  }

  return Array.isArray(data) ? data : [];
}

async function listScopeRoleAssignments(
  scopeType: ManageableScopeType,
  scopeId: string,
  userIds: string[],
) {
  if (userIds.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select: 'id,user_id,role_key,scope_type,scope_id,starts_at,ends_at,status',
    scope_type: `eq.${scopeType}`,
    scope_id: `eq.${scopeId}`,
    user_id: `in.(${Array.from(new Set(userIds)).join(',')})`,
    status: 'eq.active',
  });
  const { response, data } = await supabaseFetch<RoleAssignmentRow[]>(
    `/rest/v1/role_assignments?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải role assignments.');
  }

  return (Array.isArray(data) ? data : []).map(mapRoleAssignmentRow);
}

function mapRoleAssignmentRow(row: RoleAssignmentRow): RoleAssignmentSummary {
  return {
    id: row.id,
    userId: row.user_id,
    roleKey: row.role_key,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
  };
}

function mapUserRow(row: UserRow) {
  return {
    uid: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name ?? '',
    nickname: row.nickname ?? '',
    username: row.username,
    phoneNumber: row.phone_number ?? '-',
    schoolName: row.school_name ?? '',
    enterYear: row.enter_year ?? '',
    cohort: row.cohort ?? '',
    gender: row.gender ?? null,
    avatarUrl: row.avatar_url ?? '',
    avatarKey: row.avatar_key ?? '',
    role: row.role,
    status: row.status,
  };
}

function getUserSortName(
  user: Pick<OrganizationMemberSummary, 'lastName' | 'middleName' | 'firstName'>,
) {
  return `${user.lastName} ${user.middleName} ${user.firstName}`.trim();
}

function getRestErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }

  return fallback;
}
