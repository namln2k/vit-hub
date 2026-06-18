import { supabaseFetch } from '@/server/supabase';
import type {
  EventMembershipStatus,
  EventRoleKey,
} from '@/features/organization-structure/permissions';
import {
  EventMembershipRow,
  EventParticipantSummary,
  EventRoleAssignmentSummary,
  RepositoryConflictError,
  RepositoryForbiddenError,
} from '@/features/organization-structure/server/adminRepository/types';
import {
  ensureActiveEventParticipant,
  listEventRoleAssignments,
  listUsersByIds,
} from '@/features/organization-structure/server/adminRepository/helpers';
import {
  getUserSortName,
  mapUserRow,
} from '@/features/organization-structure/server/adminRepository/mappers';
import {
  getRestErrorMessage,
  throwEventRoleWriteError,
} from '@/features/organization-structure/server/adminRepository/errors';

export async function listEventParticipants(eventId: string): Promise<EventParticipantSummary[]> {
  const membershipQuery = new URLSearchParams({
    select: 'id,event_id,user_id,status,created_at,updated_at',
    event_id: `eq.${eventId}`,
    order: 'created_at.asc',
  });
  const { response: membershipResponse, data: membershipData } = await supabaseFetch<
    EventMembershipRow[]
  >(`/rest/v1/event_memberships?${membershipQuery.toString()}`);

  if (!membershipResponse.ok) {
    throw new Error('Không thể tải danh sách participants.');
  }

  const memberships = Array.isArray(membershipData) ? membershipData : [];

  if (memberships.length === 0) {
    return [];
  }

  const userIds = memberships.map((membership) => membership.user_id);
  const [users, roleAssignments] = await Promise.all([
    listUsersByIds(userIds),
    listEventRoleAssignments(eventId),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const rolesByUserId = new Map<string, EventRoleAssignmentSummary[]>();

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
          eventId: membership.event_id,
          status: membership.status,
          createdAt: membership.created_at,
          updatedAt: membership.updated_at,
        },
        roleAssignments: rolesByUserId.get(user.id) ?? [],
      } satisfies EventParticipantSummary;
    })
    .filter((participant): participant is EventParticipantSummary => Boolean(participant))
    .sort((first, second) => getUserSortName(first).localeCompare(getUserSortName(second)));
}

export async function addEventParticipants({
  eventId,
  userIds,
}: {
  eventId: string;
  userIds: string[];
}) {
  const uniqueUserIds = Array.from(new Set(userIds));

  if (uniqueUserIds.length === 0) {
    return;
  }

  const users = await listUsersByIds(uniqueUserIds);

  if (users.length !== uniqueUserIds.length) {
    throw new RepositoryConflictError('Một hoặc nhiều tài khoản không tồn tại.');
  }

  const disabledUser = users.find((user) => user.status !== 'active');

  if (disabledUser) {
    throw new RepositoryForbiddenError(
      `Không thể thêm user đã bị vô hiệu hóa: ${disabledUser.email}.`,
    );
  }

  const existingParticipantIds = new Set(
    (await listEventParticipants(eventId)).map((participant) => participant.uid),
  );
  const rows = uniqueUserIds
    .filter((userId) => !existingParticipantIds.has(userId))
    .map((userId) => ({
      event_id: eventId,
      user_id: userId,
      status: 'going' satisfies EventMembershipStatus,
    }));

  if (rows.length === 0) {
    return;
  }

  const { response, data } = await supabaseFetch('/rest/v1/event_memberships', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: rows,
  });

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể thêm participant.'));
  }
}

export async function updateEventParticipantStatus({
  eventId,
  userId,
  status,
}: {
  eventId: string;
  userId: string;
  status: EventMembershipStatus;
}) {
  const query = new URLSearchParams({
    event_id: `eq.${eventId}`,
    user_id: `eq.${userId}`,
  });
  const { response, data } = await supabaseFetch(`/rest/v1/event_memberships?${query.toString()}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: {
      status,
      updated_at: new Date().toISOString(),
    },
  });

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể cập nhật participant.'));
  }
}

export async function assignEventRole({
  actorId,
  eventId,
  userId,
  roleKey,
}: {
  actorId: string;
  eventId: string;
  userId: string;
  roleKey: EventRoleKey;
}) {
  await ensureActiveEventParticipant(
    eventId,
    userId,
    'Người nhận vai trò phải là participant đang hoạt động.',
  );

  const existingAssignments = await listEventRoleAssignments(eventId);

  if (
    existingAssignments.some(
      (assignment) => assignment.userId === userId && assignment.roleKey === roleKey,
    )
  ) {
    return;
  }

  if (
    roleKey === 'event_lead' &&
    existingAssignments.some((assignment) => assignment.roleKey === 'event_lead')
  ) {
    throw new RepositoryConflictError(
      'Event đã có event lead. Hãy dùng luồng chuyển giao event lead.',
    );
  }

  const { response, data } = await supabaseFetch('/rest/v1/event_role_assignments', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      event_id: eventId,
      user_id: userId,
      role_key: roleKey,
      assigned_by: actorId,
    },
  });

  if (!response.ok) {
    throwEventRoleWriteError(data, roleKey);
  }
}

export async function revokeEventRole({
  eventId,
  userId,
  roleKey,
}: {
  eventId: string;
  userId: string;
  roleKey: EventRoleKey;
}) {
  const query = new URLSearchParams({
    event_id: `eq.${eventId}`,
    user_id: `eq.${userId}`,
    role_key: `eq.${roleKey}`,
  });
  const { response, data } = await supabaseFetch(
    `/rest/v1/event_role_assignments?${query.toString()}`,
    {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    },
  );

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể thu hồi event role.'));
  }
}

export async function transferEventLead({
  actorId,
  eventId,
  targetUserId,
}: {
  actorId: string;
  eventId: string;
  targetUserId: string;
}) {
  await ensureActiveEventParticipant(
    eventId,
    targetUserId,
    'Người nhận chuyển giao phải là participant đang hoạt động.',
  );

  const existingAssignments = await listEventRoleAssignments(eventId);
  const currentLead = existingAssignments.find((assignment) => assignment.roleKey === 'event_lead');

  if (!currentLead) {
    await assignEventRole({ actorId, eventId, userId: targetUserId, roleKey: 'event_lead' });
    return;
  }

  if (currentLead.userId === targetUserId) {
    return;
  }

  await revokeEventRole({ eventId, userId: currentLead.userId, roleKey: 'event_lead' });

  try {
    await assignEventRole({ actorId, eventId, userId: targetUserId, roleKey: 'event_lead' });
  } catch (error) {
    await assignEventRole({ actorId, eventId, userId: currentLead.userId, roleKey: 'event_lead' });
    throw error;
  }
}
