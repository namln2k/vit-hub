import { jsonResponse, readJsonBody } from '@/server/api';
import {
  authorizationErrorResponse,
  canAssignEventRole,
  canManageEvent,
  canManageEventLeadWithoutEventRoles,
  canManageEventMembers,
  canRevokeEventRole,
  canUpdateEventAttendance,
  canViewEventPrivate,
  requireOrganizationActor,
} from '@/features/organization-structure/server/authorization';
import {
  addEventParticipants,
  assignEventRole,
  isEventMembershipStatus,
  isEventRoleKey,
  listEventParticipants,
  RepositoryConflictError,
  RepositoryForbiddenError,
  revokeEventRole,
  transferEventLead,
  updateEventParticipantStatus,
} from '@/features/organization-structure/server/adminRepository';

export const runtime = 'nodejs';

interface EventParticipantsBody {
  eventId?: unknown;
  userIds?: unknown;
  userId?: unknown;
  roleKey?: unknown;
  targetUserId?: unknown;
  status?: unknown;
  action?: unknown;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
}

function knownErrorResponse(error: unknown, fallback: string) {
  const authResponse = authorizationErrorResponse(error);

  if (authResponse) {
    return authResponse;
  }

  if (error instanceof RepositoryForbiddenError || error instanceof RepositoryConflictError) {
    return jsonResponse({ error: error.message }, error.status);
  }

  return jsonResponse({ error: error instanceof Error ? error.message : fallback }, 500);
}

export async function GET(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const url = new URL(request.url);
    const eventId = readString(url.searchParams.get('eventId'));

    if (!eventId) {
      return jsonResponse({ error: 'Sự kiện không hợp lệ.' }, 400);
    }

    const [
      canManage,
      canManageMembers,
      canViewPrivate,
      canAssignRoles,
      canRevokeRoles,
      canUpdateAttendance,
    ] = await Promise.all([
      canManageEvent(actor, eventId),
      canManageEventMembers(actor, eventId),
      canViewEventPrivate(actor, eventId),
      canAssignEventRole(actor, eventId),
      canRevokeEventRole(actor, eventId),
      canUpdateEventAttendance(actor, eventId),
    ]);

    if (!canManage && !canManageMembers && !canViewPrivate && !canUpdateAttendance) {
      return jsonResponse({ error: 'Bạn không có quyền xem participants của event này.' }, 403);
    }

    const participants = await listEventParticipants(eventId);
    return jsonResponse({
      participants,
      capabilities: {
        canManage,
        canManageMembers,
        canAssignRoles,
        canRevokeRoles,
        canUpdateAttendance,
      },
    });
  } catch (error) {
    return knownErrorResponse(error, 'Không thể tải participants.');
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<EventParticipantsBody>(request, 40_000);
    const eventId = readString(body.eventId);
    const userIds = readStringArray(body.userIds);

    if (!eventId || userIds.length === 0) {
      return jsonResponse({ error: 'Danh sách participant không hợp lệ.' }, 400);
    }

    if (!(await canManageEventMembers(actor, eventId))) {
      return jsonResponse({ error: 'Bạn không có quyền thêm participant cho event này.' }, 403);
    }

    await addEventParticipants({ eventId, userIds });
    return jsonResponse({ ok: true }, 201);
  } catch (error) {
    return knownErrorResponse(error, 'Không thể thêm participants.');
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<EventParticipantsBody>(request, 40_000);
    const action = readString(body.action);
    const eventId = readString(body.eventId);

    if (!eventId) {
      return jsonResponse({ error: 'Sự kiện không hợp lệ.' }, 400);
    }

    if (action === 'assign_role') {
      const userId = readString(body.userId);
      const roleKey = body.roleKey;

      if (!userId || !isEventRoleKey(roleKey)) {
        return jsonResponse({ error: 'Event role không hợp lệ.' }, 400);
      }

      if (!(await canAssignEventRole(actor, eventId))) {
        return jsonResponse({ error: 'Bạn không có quyền bổ nhiệm event role.' }, 403);
      }

      await assignEventRole({ actorId: actor.id, eventId, userId, roleKey });
      return jsonResponse({ ok: true });
    }

    if (action === 'transfer_lead') {
      const targetUserId = readString(body.targetUserId);

      if (!targetUserId) {
        return jsonResponse({ error: 'Người nhận chuyển giao không hợp lệ.' }, 400);
      }

      const canAssignLead = await canManageEventLeadWithoutEventRoles(
        actor,
        eventId,
        'event.role.assign',
      );
      const canRevokeLead = await canManageEventLeadWithoutEventRoles(
        actor,
        eventId,
        'event.role.revoke',
      );

      if (!canAssignLead || !canRevokeLead) {
        return jsonResponse(
          { error: 'Bạn không có quyền chuyển giao event lead bằng authority hiện tại.' },
          403,
        );
      }

      await transferEventLead({ actorId: actor.id, eventId, targetUserId });
      return jsonResponse({ ok: true });
    }

    if (action === 'update_status') {
      const userId = readString(body.userId);
      const status = body.status;

      if (!userId || !isEventMembershipStatus(status)) {
        return jsonResponse({ error: 'Trạng thái participant không hợp lệ.' }, 400);
      }

      if (!(await canUpdateEventAttendance(actor, eventId))) {
        return jsonResponse({ error: 'Bạn không có quyền cập nhật attendance event này.' }, 403);
      }

      await updateEventParticipantStatus({ eventId, userId, status });
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Hành động không hợp lệ.' }, 400);
  } catch (error) {
    return knownErrorResponse(error, 'Không thể cập nhật event participant.');
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<EventParticipantsBody>(request, 20_000);
    const eventId = readString(body.eventId);
    const userId = readString(body.userId);
    const roleKey = body.roleKey;

    if (!eventId || !userId || !isEventRoleKey(roleKey)) {
      return jsonResponse({ error: 'Event role không hợp lệ.' }, 400);
    }

    if (
      roleKey === 'event_lead' &&
      actor.id === userId &&
      !(await canManageEventLeadWithoutEventRoles(actor, eventId, 'event.role.revoke'))
    ) {
      return jsonResponse(
        { error: 'Event lead không thể tự gỡ vai trò bằng authority event lead.' },
        403,
      );
    }

    if (!(await canRevokeEventRole(actor, eventId))) {
      return jsonResponse({ error: 'Bạn không có quyền thu hồi event role.' }, 403);
    }

    await revokeEventRole({ eventId, userId, roleKey });
    return jsonResponse({ ok: true });
  } catch (error) {
    return knownErrorResponse(error, 'Không thể thu hồi event role.');
  }
}
