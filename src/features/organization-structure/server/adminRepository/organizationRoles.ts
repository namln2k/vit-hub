import { supabaseFetch } from '@/server/supabase';
import {
  OrganizationRoleAssignmentSummary,
  OrganizationRoleKey,
  OrganizationTechnicalAdminSummary,
  RepositoryConflictError,
  RepositoryForbiddenError,
  RoleAssignmentRow,
  UserRow,
} from '@/features/organization-structure/server/adminRepository/types';
import { USER_SELECT } from '@/features/organization-structure/server/adminRepository/metadata';
import { listUsersByIds } from '@/features/organization-structure/server/adminRepository/helpers';
import {
  mapOrganizationRoleUser,
  mapRoleAssignmentRow,
} from '@/features/organization-structure/server/adminRepository/mappers';
import {
  doTimeRangesOverlap,
  getRestErrorMessage,
  throwRoleAssignmentWriteError,
  throwTransferLeadError,
} from '@/features/organization-structure/server/adminRepository/errors';

export async function listOrganizationRoleAssignments() {
  const now = new Date().toISOString();
  const query = new URLSearchParams({
    select:
      'id,user_id,role_key,scope_type,scope_id,starts_at,ends_at,status,assigned_by,ended_by,revoked_by,created_at,updated_at',
    scope_type: 'eq.organization',
    scope_id: 'is.null',
    role_key: 'in.(captain,vice_captain)',
    status: 'eq.active',
    or: `(ends_at.is.null,ends_at.gt.${now})`,
    order: 'starts_at.asc',
  });
  const { response, data } = await supabaseFetch<RoleAssignmentRow[]>(
    `/rest/v1/role_assignments?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải chức vụ Đội.');
  }

  const assignments = (Array.isArray(data) ? data : []).filter(
    (assignment): assignment is RoleAssignmentRow & { role_key: OrganizationRoleKey } =>
      assignment.role_key === 'captain' || assignment.role_key === 'vice_captain',
  );
  const users = await listUsersByIds(assignments.map((assignment) => assignment.user_id));
  const usersById = new Map(users.map((user) => [user.id, user]));

  return assignments
    .map((assignment) => {
      const user = usersById.get(assignment.user_id);

      if (!user) {
        return null;
      }

      return {
        ...mapRoleAssignmentRow(assignment),
        roleKey: assignment.role_key,
        user: mapOrganizationRoleUser(user),
      } satisfies OrganizationRoleAssignmentSummary;
    })
    .filter((assignment): assignment is OrganizationRoleAssignmentSummary => Boolean(assignment));
}

export async function listTechnicalSuperAdmins(
  roleAssignments: OrganizationRoleAssignmentSummary[],
) {
  const query = new URLSearchParams({
    select: USER_SELECT,
    role: 'eq.super_admin',
    order: 'username.asc',
  });
  const { response, data } = await supabaseFetch<UserRow[]>(`/rest/v1/user?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Không thể tải danh sách super admin.');
  }

  const captainUserIds = new Set(
    roleAssignments
      .filter((assignment) => assignment.roleKey === 'captain')
      .map((assignment) => assignment.userId),
  );
  const viceCaptainUserIds = new Set(
    roleAssignments
      .filter((assignment) => assignment.roleKey === 'vice_captain')
      .map((assignment) => assignment.userId),
  );

  return (Array.isArray(data) ? data : []).map((user) => ({
    ...mapOrganizationRoleUser(user),
    hasCaptainAssignment: captainUserIds.has(user.id),
    hasViceCaptainAssignment: viceCaptainUserIds.has(user.id),
  })) satisfies OrganizationTechnicalAdminSummary[];
}

export async function assignOrganizationRole({
  actorId,
  userId,
  roleKey,
  startsAt = new Date().toISOString(),
  endsAt = null,
}: {
  actorId: string;
  userId: string;
  roleKey: OrganizationRoleKey;
  startsAt?: string;
  endsAt?: string | null;
}) {
  const targetUsers = await listUsersByIds([userId]);
  const targetUser = targetUsers[0] ?? null;

  if (!targetUser) {
    throw new RepositoryConflictError('Không tìm thấy người nhận chức vụ.');
  }

  if (targetUser.status !== 'active') {
    throw new RepositoryForbiddenError('Người nhận chức vụ phải là tài khoản đang hoạt động.');
  }

  const existingAssignments = await listOrganizationRoleAssignments();
  const existingAssignment = existingAssignments.find(
    (assignment) =>
      assignment.userId === userId &&
      assignment.roleKey === roleKey &&
      doTimeRangesOverlap(assignment.startsAt, assignment.endsAt, startsAt, endsAt),
  );

  if (existingAssignment) {
    return;
  }

  if (
    roleKey === 'captain' &&
    existingAssignments.some(
      (assignment) =>
        assignment.roleKey === 'captain' &&
        doTimeRangesOverlap(assignment.startsAt, assignment.endsAt, startsAt, endsAt),
    )
  ) {
    throw new RepositoryConflictError(
      'Đội đã có Đội trưởng trong khoảng thời gian đó. Hãy dùng luồng chuyển giao Đội trưởng.',
    );
  }

  const { response, data } = await supabaseFetch('/rest/v1/role_assignments', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      user_id: userId,
      role_key: roleKey,
      scope_type: 'organization',
      scope_id: null,
      starts_at: startsAt,
      ends_at: endsAt,
      status: 'active',
      assigned_by: actorId,
    },
  });

  if (!response.ok) {
    throwRoleAssignmentWriteError(data, roleKey);
  }
}

export async function endOrganizationRoleAssignments({
  actorId,
  userId,
  roleKey,
  endedAt = new Date().toISOString(),
}: {
  actorId: string;
  userId: string;
  roleKey: OrganizationRoleKey;
  endedAt?: string;
}) {
  const query = new URLSearchParams({
    scope_type: 'eq.organization',
    scope_id: 'is.null',
    user_id: `eq.${userId}`,
    role_key: `eq.${roleKey}`,
    status: 'eq.active',
  });
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
    throw new Error(getRestErrorMessage(data, 'Không thể kết thúc chức vụ Đội.'));
  }
}

export async function transferOrganizationCaptain({
  actorId,
  targetUserId,
}: {
  actorId: string;
  targetUserId: string;
}) {
  const targetUsers = await listUsersByIds([targetUserId]);
  const targetUser = targetUsers[0] ?? null;

  if (!targetUser) {
    throw new RepositoryConflictError('Không tìm thấy người nhận chuyển giao.');
  }

  if (targetUser.status !== 'active') {
    throw new RepositoryForbiddenError('Người nhận chuyển giao phải là tài khoản đang hoạt động.');
  }

  const { response, data } = await supabaseFetch('/rest/v1/rpc/transfer_organization_captain', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      p_actor_id: actorId,
      p_target_user_id: targetUserId,
    },
  });

  if (!response.ok) {
    throwTransferLeadError(data);
  }
}
