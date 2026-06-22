import { supabaseFetch } from '@/server/supabase';
import {
  ManageableScopeType,
  MembershipRow,
  OrganizationMemberSummary,
  RoleAssignmentSummary,
} from '@/features/organization-structure/server/adminRepository/types';
import {
  getDeputyRoleKey,
  getLeadRoleKey,
  getMembershipTable,
  getScopeIdColumn,
} from '@/features/organization-structure/server/adminRepository/metadata';
import {
  endScopeRoleAssignments,
  revokeScopeRoleAssignments,
} from '@/features/organization-structure/server/adminRepository/scopeRoles';
import {
  listScopeRoleAssignments,
  listUsersByIds,
} from '@/features/organization-structure/server/adminRepository/helpers';
import {
  getUserSortName,
  mapLifecycleActorRow,
  mapUserRow,
} from '@/features/organization-structure/server/adminRepository/mappers';
import { getRestErrorMessage } from '@/features/organization-structure/server/adminRepository/errors';

export async function listScopeMembers(scopeType: ManageableScopeType, scopeId: string) {
  const table = getMembershipTable(scopeType);
  const scopeIdColumn = getScopeIdColumn(scopeType);
  const membershipQuery = new URLSearchParams({
    select:
      'id,user_id,starts_at,ends_at,status,source,added_by,ended_by,revoked_by,created_at,updated_at',
    [scopeIdColumn]: `eq.${scopeId}`,
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

  const lifecycleActorIds = memberships.flatMap((membership) =>
    [membership.added_by, membership.ended_by, membership.revoked_by].filter(
      (userId): userId is string => Boolean(userId),
    ),
  );
  const [users, roleAssignments] = await Promise.all([
    listUsersByIds(userIds),
    listScopeRoleAssignments(scopeType, scopeId, userIds),
  ]);
  const lifecycleActors = await listUsersByIds(lifecycleActorIds);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const lifecycleActorsById = new Map(
    lifecycleActors.map((user) => [user.id, mapLifecycleActorRow(user)]),
  );
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
          addedBy: membership.added_by
            ? (lifecycleActorsById.get(membership.added_by) ?? null)
            : null,
          endedBy: membership.ended_by
            ? (lifecycleActorsById.get(membership.ended_by) ?? null)
            : null,
          revokedBy: membership.revoked_by
            ? (lifecycleActorsById.get(membership.revoked_by) ?? null)
            : null,
          createdAt: membership.created_at,
          updatedAt: membership.updated_at,
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
  startsAt = new Date().toISOString(),
  source = 'manual',
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  userIds: string[];
  startsAt?: string;
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

  const startTime = new Date(startsAt).getTime();
  const existingIds = new Set(
    (await listScopeMembers(scopeType, scopeId))
      .filter(
        (member) =>
          member.membership.status === 'active' &&
          (!member.membership.endsAt || new Date(member.membership.endsAt).getTime() > startTime),
      )
      .map((member) => member.uid),
  );
  const rows = uniqueUserIds
    .filter((userId) => !existingIds.has(userId))
    .map((userId) => ({
      [getScopeIdColumn(scopeType)]: scopeId,
      user_id: userId,
      starts_at: startsAt,
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
  endedAt = new Date().toISOString(),
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  userIds: string[];
  endedAt?: string;
}) {
  const uniqueUserIds = Array.from(new Set(userIds));

  if (uniqueUserIds.length === 0) {
    return;
  }

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

export async function revokeScopeMembers({
  actorId,
  scopeType,
  scopeId,
  userIds,
  revokedAt = new Date().toISOString(),
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  userIds: string[];
  revokedAt?: string;
}) {
  const uniqueUserIds = Array.from(new Set(userIds));

  if (uniqueUserIds.length === 0) {
    return;
  }

  const query = new URLSearchParams({
    [getScopeIdColumn(scopeType)]: `eq.${scopeId}`,
    user_id: `in.(${uniqueUserIds.join(',')})`,
    status: 'eq.active',
    starts_at: `lte.${revokedAt}`,
  });
  const { response, data } = await supabaseFetch<MembershipRow[]>(
    `/rest/v1/${getMembershipTable(scopeType)}?${query.toString()}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: {
        status: 'revoked',
        ends_at: revokedAt,
        revoked_by: actorId,
        updated_at: revokedAt,
      },
    },
  );

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể thu hồi membership.'));
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Không tìm thấy membership đang hiệu lực để thu hồi.');
  }

  await revokeScopeRoleAssignments({
    actorId,
    scopeType,
    scopeId,
    userIds: uniqueUserIds,
    roleKeys: [getLeadRoleKey(scopeType), getDeputyRoleKey(scopeType)],
    revokedAt,
  });
}
