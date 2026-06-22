import { supabaseFetch } from '@/server/supabase';
import type { NonEventRoleKey } from '@/features/organization-structure/permissions';
import {
  ClubRow,
  ClubSummary,
  DivisionRow,
  EventRoleAssignmentRow,
  EventRoleAssignmentSummary,
  EventRow,
  EventSummary,
  GroupRow,
  ManageableScopeType,
  RepositoryConflictError,
  RepositoryForbiddenError,
  RoleAssignmentRow,
  UserRow,
} from '@/features/organization-structure/server/adminRepository/types';
import { USER_SELECT } from '@/features/organization-structure/server/adminRepository/metadata';
import { getClub } from '@/features/organization-structure/server/adminRepository/clubs';
import { doTimeRangesOverlap } from '@/features/organization-structure/server/adminRepository/errors';
import {
  getUserSortName,
  mapLifecycleActorRow,
  mapRoleAssignmentRow,
  mapUserRow,
} from '@/features/organization-structure/server/adminRepository/mappers';

export async function listUsersByIds(userIds: string[]) {
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

export async function listEventRoleAssignments(eventId: string) {
  const query = new URLSearchParams({
    select: 'id,event_id,user_id,role_key,assigned_by,assigned_at',
    event_id: `eq.${eventId}`,
    order: 'assigned_at.asc',
  });
  const { response, data } = await supabaseFetch<EventRoleAssignmentRow[]>(
    `/rest/v1/event_role_assignments?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải event roles.');
  }

  return (Array.isArray(data) ? data : []).map((assignment) => ({
    id: assignment.id,
    eventId: assignment.event_id,
    userId: assignment.user_id,
    roleKey: assignment.role_key,
    assignedBy: assignment.assigned_by,
    assignedAt: assignment.assigned_at,
  })) satisfies EventRoleAssignmentSummary[];
}

export async function ensureActiveEventParticipant(
  eventId: string,
  userId: string,
  message: string,
) {
  const users = await listUsersByIds([userId]);
  const user = users[0] ?? null;

  if (!user) {
    throw new RepositoryConflictError('Không tìm thấy tài khoản.');
  }

  if (user.status !== 'active') {
    throw new RepositoryForbiddenError(message);
  }

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
    throw new Error('Không thể kiểm tra participant.');
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new RepositoryConflictError('User phải là participant của event trước khi nhận vai trò.');
  }
}

export async function listDivisionsByIds(divisionIds: string[]) {
  const uniqueDivisionIds = Array.from(new Set(divisionIds));

  if (uniqueDivisionIds.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select: 'id,name',
    id: `in.(${uniqueDivisionIds.join(',')})`,
  });
  const { response, data } = await supabaseFetch<DivisionRow[]>(
    `/rest/v1/divisions?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải mảng của CLB/tổ.');
  }

  return Array.isArray(data) ? data : [];
}

export async function listGroupsByIds(groupIds: string[]) {
  const uniqueGroupIds = Array.from(new Set(groupIds));

  if (uniqueGroupIds.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select: 'id,name',
    id: `in.(${uniqueGroupIds.join(',')})`,
  });
  const { response, data } = await supabaseFetch<GroupRow[]>(`/rest/v1/groups?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Không thể tải nhóm.');
  }

  return Array.isArray(data) ? data : [];
}

export async function listClubRowsByIds(clubIds: string[]) {
  const uniqueClubIds = Array.from(new Set(clubIds));

  if (uniqueClubIds.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select: 'id,division_id,name,description,archived_at,created_at,updated_at',
    id: `in.(${uniqueClubIds.join(',')})`,
  });
  const { response, data } = await supabaseFetch<ClubRow[]>(`/rest/v1/clubs?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Không thể tải CLB/tổ.');
  }

  return Array.isArray(data) ? data : [];
}

export async function countClubMembers(clubIds: string[]) {
  const uniqueClubIds = Array.from(new Set(clubIds));
  const counts = new Map<string, number>();

  if (uniqueClubIds.length === 0) {
    return counts;
  }

  const query = new URLSearchParams({
    select: 'club_id',
    club_id: `in.(${uniqueClubIds.join(',')})`,
    status: 'eq.active',
  });
  const { response, data } = await supabaseFetch<Array<{ club_id: string }>>(
    `/rest/v1/club_memberships?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải số thành viên CLB/tổ.');
  }

  for (const row of Array.isArray(data) ? data : []) {
    counts.set(row.club_id, (counts.get(row.club_id) ?? 0) + 1);
  }

  return counts;
}

export async function mapEventRows(rows: EventRow[]) {
  const divisionIds = rows
    .filter((row) => row.owner_scope_type === 'division' && row.owner_scope_id)
    .map((row) => String(row.owner_scope_id));
  const groupIds = rows
    .filter((row) => row.owner_scope_type === 'group' && row.owner_scope_id)
    .map((row) => String(row.owner_scope_id));
  const clubIds = rows
    .filter((row) => row.owner_scope_type === 'club' && row.owner_scope_id)
    .map((row) => String(row.owner_scope_id));
  const [divisions, groups, clubs] = await Promise.all([
    listDivisionsByIds(divisionIds),
    listGroupsByIds(groupIds),
    listClubRowsByIds(clubIds),
  ]);
  const divisionsById = new Map(divisions.map((division) => [division.id, division.name]));
  const groupsById = new Map(groups.map((group) => [group.id, group.name]));
  const clubsById = new Map(clubs.map((club) => [club.id, club.name]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    ownerScopeType: row.owner_scope_type,
    ownerScopeId: row.owner_scope_id,
    ownerScopeName: getEventOwnerScopeName(row, divisionsById, groupsById, clubsById),
    visibility: row.visibility,
    showParticipantsPublicly: row.show_participants_publicly,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    publicLocation: row.public_location ?? '',
    publicDescription: row.public_description ?? '',
    internalNotes: row.internal_notes ?? '',
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })) satisfies EventSummary[];
}

export function getEventOwnerScopeName(
  row: EventRow,
  divisionsById: Map<string, string>,
  groupsById: Map<string, string>,
  clubsById: Map<string, string>,
) {
  if (row.owner_scope_type === 'organization') {
    return 'Toàn Đội';
  }

  if (!row.owner_scope_id) {
    return 'Không rõ scope';
  }

  if (row.owner_scope_type === 'division') {
    return divisionsById.get(row.owner_scope_id) ?? row.owner_scope_id;
  }

  if (row.owner_scope_type === 'group') {
    return groupsById.get(row.owner_scope_id) ?? row.owner_scope_id;
  }

  return clubsById.get(row.owner_scope_id) ?? row.owner_scope_id;
}

export async function listClubRoleSummaries(clubIds: string[]) {
  const uniqueClubIds = Array.from(new Set(clubIds));
  const summaries = new Map<
    string,
    {
      leads: Array<{ userId: string; name: string; email: string }>;
      deputies: Array<{ userId: string; name: string; email: string }>;
    }
  >();

  if (uniqueClubIds.length === 0) {
    return summaries;
  }

  const query = new URLSearchParams({
    select:
      'id,user_id,role_key,scope_type,scope_id,starts_at,ends_at,status,assigned_by,ended_by,revoked_by,created_at,updated_at',
    scope_type: 'eq.club',
    scope_id: `in.(${uniqueClubIds.join(',')})`,
    role_key: 'in.(club_lead,club_deputy)',
    status: 'eq.active',
  });
  const { response, data } = await supabaseFetch<RoleAssignmentRow[]>(
    `/rest/v1/role_assignments?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải chức vụ CLB/tổ.');
  }

  const assignments = Array.isArray(data) ? data : [];
  const users = await listUsersByIds(assignments.map((assignment) => assignment.user_id));
  const usersById = new Map(users.map((user) => [user.id, user]));

  for (const assignment of assignments) {
    if (!assignment.scope_id) {
      continue;
    }

    const user = usersById.get(assignment.user_id);

    if (!user) {
      continue;
    }

    const summary = summaries.get(assignment.scope_id) ?? { leads: [], deputies: [] };
    const userSummary = {
      userId: user.id,
      name: getUserSortName(mapUserRow(user)),
      email: user.email,
    };

    if (assignment.role_key === 'club_lead') {
      summary.leads.push(userSummary);
    } else if (assignment.role_key === 'club_deputy') {
      summary.deputies.push(userSummary);
    }

    summaries.set(assignment.scope_id, summary);
  }

  return summaries;
}

export async function getCreatedOrUpdatedClub(clubId: string) {
  const club = await getClub(clubId);

  if (!club) {
    throw new Error('Không tìm thấy CLB/tổ.');
  }

  return club;
}

export function mapClubRow(
  row: ClubRow,
  divisionsById: Map<string, DivisionRow>,
  memberCounts: Map<string, number>,
  roleSummaries: Map<
    string,
    {
      leads: Array<{ userId: string; name: string; email: string }>;
      deputies: Array<{ userId: string; name: string; email: string }>;
    }
  >,
): ClubSummary {
  const roleSummary = roleSummaries.get(row.id) ?? { leads: [], deputies: [] };

  return {
    id: row.id,
    divisionId: row.division_id,
    divisionName: divisionsById.get(row.division_id)?.name ?? 'Không rõ mảng',
    name: row.name,
    description: row.description ?? '',
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    memberCount: memberCounts.get(row.id) ?? 0,
    leads: roleSummary.leads,
    deputies: roleSummary.deputies,
  };
}

export async function listScopeRoleAssignments(
  scopeType: ManageableScopeType,
  scopeId: string,
  userIds: string[],
) {
  if (userIds.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select:
      'id,user_id,role_key,scope_type,scope_id,starts_at,ends_at,status,assigned_by,ended_by,revoked_by,created_at,updated_at',
    scope_type: `eq.${scopeType}`,
    scope_id: `eq.${scopeId}`,
    user_id: `in.(${Array.from(new Set(userIds)).join(',')})`,
    order: 'starts_at.desc',
  });
  const { response, data } = await supabaseFetch<RoleAssignmentRow[]>(
    `/rest/v1/role_assignments?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải role assignments.');
  }

  const rows = Array.isArray(data) ? data : [];
  const actorIds = rows.flatMap((assignment) =>
    [assignment.assigned_by, assignment.ended_by, assignment.revoked_by].filter(
      (userId): userId is string => Boolean(userId),
    ),
  );
  const actors = await listUsersByIds(actorIds);
  const actorsById = new Map(actors.map((actor) => [actor.id, mapLifecycleActorRow(actor)]));

  return rows.map((row) => mapRoleAssignmentRow(row, actorsById));
}

export async function hasConflictingLeadAssignment({
  scopeType,
  scopeId,
  roleKey,
  startsAt,
  endsAt,
}: {
  scopeType: ManageableScopeType;
  scopeId: string;
  roleKey: NonEventRoleKey;
  startsAt: string;
  endsAt: string | null;
}) {
  const query = new URLSearchParams({
    select:
      'id,user_id,role_key,scope_type,scope_id,starts_at,ends_at,status,assigned_by,ended_by,revoked_by,created_at,updated_at',
    scope_type: `eq.${scopeType}`,
    scope_id: `eq.${scopeId}`,
    role_key: `eq.${roleKey}`,
    status: 'eq.active',
  });
  const { response, data } = await supabaseFetch<RoleAssignmentRow[]>(
    `/rest/v1/role_assignments?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể kiểm tra cấp trưởng hiện tại.');
  }

  return (Array.isArray(data) ? data : []).some((assignment) =>
    doTimeRangesOverlap(assignment.starts_at, assignment.ends_at, startsAt, endsAt),
  );
}
