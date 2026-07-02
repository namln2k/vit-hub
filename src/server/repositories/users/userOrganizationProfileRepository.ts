import 'server-only';

import { ROLE_LABELS } from '@/features/organization-structure/permissions';
import type {
  MembershipStatus,
  NonEventRoleKey,
  NonEventScopeType,
} from '@/features/organization-structure/permissions';
import type {
  UserOrganizationMembershipDto,
  UserOrganizationProfileDto,
  UserOrganizationRoleDto,
} from '@/features/users/types';
import { InfrastructureError } from '@/server/services/shared/errors';
import { supabaseFetch } from '@/server/supabase';

type ManageableProfileScopeType = Exclude<NonEventScopeType, 'organization'>;

interface RoleAssignmentRow {
  id: string;
  role_key: NonEventRoleKey;
  scope_type: NonEventScopeType;
  scope_id: string | null;
  starts_at: string;
  ends_at: string | null;
  status: MembershipStatus;
}

interface MembershipRow {
  id: string;
  scope_id: string;
  starts_at: string;
  ends_at: string | null;
  status: MembershipStatus;
}

interface ScopeNameRow {
  id: string;
  name: string;
}

export interface UserOrganizationProfileRepository {
  getForUser(userId: string, now: string): Promise<UserOrganizationProfileDto>;
}

export const userOrganizationProfileRepository: UserOrganizationProfileRepository = {
  async getForUser(userId, now) {
    const [roleRows, divisionRows, groupRows, clubRows] = await Promise.all([
      listRoleAssignments(userId),
      listMemberships('division', userId),
      listMemberships('group', userId),
      listMemberships('club', userId),
    ]);
    const scopeNames = await listScopeNames([
      ...roleRows.map((row) => ({ type: row.scope_type, id: row.scope_id })),
      ...divisionRows.map((row) => ({ type: 'division' as const, id: row.scope_id })),
      ...groupRows.map((row) => ({ type: 'group' as const, id: row.scope_id })),
      ...clubRows.map((row) => ({ type: 'club' as const, id: row.scope_id })),
    ]);

    return {
      currentRoles: roleRows
        .filter((row) => isCurrent(row, now))
        .map((row) => mapRole(row, scopeNames)),
      pastRoles: roleRows
        .filter((row) => isPast(row, now))
        .map((row) => mapRole(row, scopeNames)),
      divisions: splitMemberships(divisionRows, now, scopeNames.division),
      groups: splitMemberships(groupRows, now, scopeNames.group),
      clubs: splitMemberships(clubRows, now, scopeNames.club),
    };
  },
};

async function listRoleAssignments(userId: string) {
  const query = new URLSearchParams({
    select: 'id,role_key,scope_type,scope_id,starts_at,ends_at,status',
    user_id: `eq.${userId}`,
    order: 'starts_at.desc',
  });
  const { response, data } = await supabaseFetch<RoleAssignmentRow[]>(
    `/rest/v1/role_assignments?${query.toString()}`,
  );

  if (!response.ok) {
    throw new InfrastructureError('Không thể tải lịch sử chức vụ.');
  }

  return Array.isArray(data) ? data : [];
}

async function listMemberships(scopeType: ManageableProfileScopeType, userId: string) {
  const query = new URLSearchParams({
    select: `id,${getScopeIdColumn(scopeType)},starts_at,ends_at,status`,
    user_id: `eq.${userId}`,
    order: 'starts_at.desc',
  });
  const { response, data } = await supabaseFetch<Record<string, unknown>[]>(
    `/rest/v1/${getMembershipTable(scopeType)}?${query.toString()}`,
  );

  if (!response.ok) {
    throw new InfrastructureError(`Không thể tải ${getScopeTypeLabel(scopeType)} của người dùng.`);
  }

  return (Array.isArray(data) ? data : []).map((row) => ({
    id: String(row.id),
    scope_id: String(row[getScopeIdColumn(scopeType)]),
    starts_at: String(row.starts_at),
    ends_at: typeof row.ends_at === 'string' ? row.ends_at : null,
    status: row.status as MembershipStatus,
  })) satisfies MembershipRow[];
}

async function listScopeNames(scopeRefs: Array<{ type: NonEventScopeType; id: string | null }>) {
  const scopeIds = {
    division: collectScopeIds(scopeRefs, 'division'),
    group: collectScopeIds(scopeRefs, 'group'),
    club: collectScopeIds(scopeRefs, 'club'),
  };
  const [divisions, groups, clubs] = await Promise.all([
    listNames('divisions', scopeIds.division, 'Không thể tải tên mảng.'),
    listNames('groups', scopeIds.group, 'Không thể tải tên nhóm.'),
    listNames('clubs', scopeIds.club, 'Không thể tải tên CLB/tổ.'),
  ]);

  return {
    organization: new Map<string, string>([['organization', 'Toàn Đội']]),
    division: divisions,
    group: groups,
    club: clubs,
  } satisfies Record<NonEventScopeType, Map<string, string>>;
}

async function listNames(table: string, ids: string[], errorMessage: string) {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const query = new URLSearchParams({
    select: 'id,name',
    id: `in.(${ids.join(',')})`,
  });
  const { response, data } = await supabaseFetch<ScopeNameRow[]>(
    `/rest/v1/${table}?${query.toString()}`,
  );

  if (!response.ok) {
    throw new InfrastructureError(errorMessage);
  }

  return new Map((Array.isArray(data) ? data : []).map((row) => [row.id, row.name]));
}

function collectScopeIds(
  scopeRefs: Array<{ type: NonEventScopeType; id: string | null }>,
  type: ManageableProfileScopeType,
) {
  return Array.from(
    new Set(
      scopeRefs
        .filter((scopeRef) => scopeRef.type === type && scopeRef.id)
        .map((scopeRef) => String(scopeRef.id)),
    ),
  );
}

function mapRole(
  row: RoleAssignmentRow,
  scopeNames: Record<NonEventScopeType, Map<string, string>>,
): UserOrganizationRoleDto {
  const scopeName =
    row.scope_type === 'organization'
      ? 'Toàn Đội'
      : (row.scope_id ? scopeNames[row.scope_type].get(row.scope_id) : null) ??
        row.scope_id ??
        'Không rõ scope';

  return {
    id: row.id,
    roleKey: row.role_key,
    roleLabel: ROLE_LABELS[row.role_key],
    scopeType: row.scope_type,
    scopeName,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
  };
}

function splitMemberships(
  rows: MembershipRow[],
  now: string,
  names: Map<string, string>,
): { current: UserOrganizationMembershipDto[]; past: UserOrganizationMembershipDto[] } {
  const current: UserOrganizationMembershipDto[] = [];
  const past: UserOrganizationMembershipDto[] = [];

  for (const row of rows) {
    const item = {
      id: row.id,
      scopeId: row.scope_id,
      scopeName: names.get(row.scope_id) ?? row.scope_id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status,
    };

    if (isCurrent(row, now)) {
      current.push(item);
    } else if (isPast(row, now)) {
      past.push(item);
    }
  }

  return { current, past };
}

function isCurrent(
  row: { status: MembershipStatus; starts_at: string; ends_at: string | null },
  now: string,
) {
  return row.status === 'active' && row.starts_at <= now && (!row.ends_at || row.ends_at > now);
}

function isPast(
  row: { status: MembershipStatus; starts_at: string; ends_at: string | null },
  now: string,
) {
  return (
    row.starts_at <= now && (row.status !== 'active' || Boolean(row.ends_at && row.ends_at <= now))
  );
}

function getMembershipTable(scopeType: ManageableProfileScopeType) {
  if (scopeType === 'division') {
    return 'division_memberships';
  }

  if (scopeType === 'group') {
    return 'group_memberships';
  }

  return 'club_memberships';
}

function getScopeIdColumn(scopeType: ManageableProfileScopeType) {
  if (scopeType === 'division') {
    return 'division_id';
  }

  if (scopeType === 'group') {
    return 'group_id';
  }

  return 'club_id';
}

function getScopeTypeLabel(scopeType: ManageableProfileScopeType) {
  if (scopeType === 'division') {
    return 'mảng';
  }

  if (scopeType === 'group') {
    return 'nhóm';
  }

  return 'CLB/tổ';
}
