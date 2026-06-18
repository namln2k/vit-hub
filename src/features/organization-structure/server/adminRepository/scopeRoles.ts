import { supabaseFetch } from '@/server/supabase';
import type { NonEventRoleKey } from '@/features/organization-structure/permissions';
import {
  ManageableScopeType,
  RepositoryConflictError,
  RepositoryForbiddenError,
} from '@/features/organization-structure/server/adminRepository/types';
import { getLeadRoleKey } from '@/features/organization-structure/server/adminRepository/metadata';
import { addScopeMembers } from '@/features/organization-structure/server/adminRepository/scopeMemberships';
import {
  hasConflictingLeadAssignment,
  listScopeRoleAssignments,
  listUsersByIds,
} from '@/features/organization-structure/server/adminRepository/helpers';
import {
  doTimeRangesOverlap,
  getRestErrorMessage,
  throwRoleAssignmentWriteError,
  throwTransferLeadError,
} from '@/features/organization-structure/server/adminRepository/errors';

export async function assignScopeRole({
  actorId,
  scopeType,
  scopeId,
  userId,
  roleKey,
  startsAt = new Date().toISOString(),
  endsAt = null,
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  userId: string;
  roleKey: NonEventRoleKey;
  startsAt?: string;
  endsAt?: string | null;
}) {
  const activeAssignments = await listScopeRoleAssignments(scopeType, scopeId, [userId]);
  const existingAssignment = activeAssignments.find(
    (assignment) =>
      assignment.status === 'active' &&
      assignment.roleKey === roleKey &&
      doTimeRangesOverlap(assignment.startsAt, assignment.endsAt, startsAt, endsAt),
  );

  if (existingAssignment) {
    return;
  }

  if (roleKey === getLeadRoleKey(scopeType)) {
    const hasConflictingLead = await hasConflictingLeadAssignment({
      scopeType,
      scopeId,
      roleKey,
      startsAt,
      endsAt,
    });

    if (hasConflictingLead) {
      throw new RepositoryConflictError(
        'Scope này đã có cấp trưởng trong khoảng thời gian đó. Hãy dùng luồng chuyển giao trưởng.',
      );
    }
  }

  await addScopeMembers({
    actorId,
    scopeType,
    scopeId,
    userIds: [userId],
    startsAt,
    source: 'role_assignment_auto',
  });

  const { response, data } = await supabaseFetch('/rest/v1/role_assignments', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      user_id: userId,
      role_key: roleKey,
      scope_type: scopeType,
      scope_id: scopeId,
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

export async function transferScopeLead({
  actorId,
  scopeType,
  scopeId,
  targetUserId,
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
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

  const { response, data } = await supabaseFetch('/rest/v1/rpc/transfer_scope_lead', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      p_actor_id: actorId,
      p_scope_type: scopeType,
      p_scope_id: scopeId,
      p_target_user_id: targetUserId,
    },
  });

  if (!response.ok) {
    throwTransferLeadError(data);
  }
}

export async function revokeScopeRoleAssignments({
  actorId,
  scopeType,
  scopeId,
  userIds,
  roleKeys,
  revokedAt = new Date().toISOString(),
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  userIds: string[];
  roleKeys: NonEventRoleKey[];
  revokedAt?: string;
}) {
  const query = new URLSearchParams({
    scope_type: `eq.${scopeType}`,
    scope_id: `eq.${scopeId}`,
    role_key: `in.(${roleKeys.join(',')})`,
    status: 'eq.active',
    starts_at: `lte.${revokedAt}`,
  });

  if (userIds.length > 0) {
    query.set('user_id', `in.(${Array.from(new Set(userIds)).join(',')})`);
  }

  const { response, data } = await supabaseFetch(`/rest/v1/role_assignments?${query.toString()}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: {
      status: 'revoked',
      ends_at: revokedAt,
      revoked_by: actorId,
      updated_at: revokedAt,
    },
  });

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể thu hồi vai trò.'));
  }
}
