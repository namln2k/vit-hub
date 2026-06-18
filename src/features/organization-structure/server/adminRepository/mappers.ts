import type {
  LifecycleActorSummary,
  OrganizationMemberSummary,
  OrganizationRoleAssignmentSummary,
  RoleAssignmentRow,
  RoleAssignmentSummary,
  UserRow,
} from '@/features/organization-structure/server/adminRepository/types';

export function mapRoleAssignmentRow(
  row: RoleAssignmentRow,
  actorsById: Map<string, LifecycleActorSummary> = new Map(),
): RoleAssignmentSummary {
  return {
    id: row.id,
    userId: row.user_id,
    roleKey: row.role_key,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    assignedBy: row.assigned_by ? (actorsById.get(row.assigned_by) ?? null) : null,
    endedBy: row.ended_by ? (actorsById.get(row.ended_by) ?? null) : null,
    revokedBy: row.revoked_by ? (actorsById.get(row.revoked_by) ?? null) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapLifecycleActorRow(row: UserRow): LifecycleActorSummary {
  return {
    id: row.id,
    name: getUserSortName(mapUserRow(row)) || row.email,
    email: row.email,
  };
}

export function mapOrganizationRoleUser(row: UserRow): OrganizationRoleAssignmentSummary['user'] {
  const user = mapUserRow(row);

  return {
    id: user.uid,
    email: user.email,
    name: getUserSortName(user) || user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    appRole: user.role,
    status: user.status,
  };
}

export function mapUserRow(row: UserRow) {
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

export function getUserSortName(
  user: Pick<OrganizationMemberSummary, 'lastName' | 'middleName' | 'firstName'>,
) {
  return `${user.lastName} ${user.middleName} ${user.firstName}`.trim();
}
