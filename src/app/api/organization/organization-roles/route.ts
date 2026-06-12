import { jsonResponse, readJsonBody } from '@/server/api';
import {
  authorizationErrorResponse,
  hasDomainPermission,
  type OrganizationActor,
  requireOrganizationActor,
} from '@/features/organization-structure/server/authorization';
import {
  assignOrganizationRole,
  endOrganizationRoleAssignments,
  isOrganizationRoleKey,
  listOrganizationRoleAssignments,
  listTechnicalSuperAdmins,
  RepositoryConflictError,
  RepositoryForbiddenError,
  transferOrganizationCaptain,
  type OrganizationRoleKey,
} from '@/features/organization-structure/server/adminRepository';

export const runtime = 'nodejs';

interface OrganizationRoleBody {
  userId?: unknown;
  roleKey?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  endedAt?: unknown;
  targetUserId?: unknown;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readOptionalIsoDate(value: unknown, fallback?: string) {
  const rawValue = readString(value);

  if (!rawValue) {
    return fallback ?? null;
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

async function canViewOrganizationRoles(actor: OrganizationActor) {
  return hasDomainPermission(actor, 'permission.view', { type: 'organization', id: null });
}

async function canChangeOrganizationRole(
  actor: OrganizationActor,
  roleKey: OrganizationRoleKey,
  operation: 'assign' | 'revoke',
) {
  const permissionKey =
    roleKey === 'captain'
      ? operation === 'assign'
        ? 'scope.role.assign_lead'
        : 'scope.role.revoke_lead'
      : operation === 'assign'
        ? 'scope.role.assign_deputy'
        : 'scope.role.revoke_deputy';

  return hasDomainPermission(actor, permissionKey, { type: 'organization', id: null });
}

async function canTransferCaptain(actor: OrganizationActor) {
  if (!(await canChangeOrganizationRole(actor, 'captain', 'assign'))) {
    return false;
  }

  const filteredActor: OrganizationActor = {
    ...actor,
    roleAssignments: actor.roleAssignments.filter(
      (assignment) =>
        !(
          assignment.scope_type === 'organization' &&
          assignment.scope_id === null &&
          assignment.role_key === 'captain'
        ),
    ),
  };

  if (filteredActor.roleAssignments.length === actor.roleAssignments.length) {
    return true;
  }

  return canChangeOrganizationRole(filteredActor, 'captain', 'assign');
}

function roleErrorResponse(error: unknown, fallback: string) {
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

    if (!(await canViewOrganizationRoles(actor))) {
      return jsonResponse({ error: 'Bạn không có quyền xem chức vụ Đội.' }, 403);
    }

    const assignments = await listOrganizationRoleAssignments();
    const technicalAdmins = await listTechnicalSuperAdmins(assignments);

    return jsonResponse({ assignments, technicalAdmins });
  } catch (error) {
    return roleErrorResponse(error, 'Không thể tải chức vụ Đội.');
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<OrganizationRoleBody>(request, 20_000);
    const userId = readString(body.userId);
    const roleKey = body.roleKey;

    if (!userId || !isOrganizationRoleKey(roleKey)) {
      return jsonResponse({ error: 'Dữ liệu bổ nhiệm chức vụ Đội không hợp lệ.' }, 400);
    }

    const startsAt = readOptionalIsoDate(body.startsAt, new Date().toISOString());
    const endsAt = readOptionalIsoDate(body.endsAt);

    if (!startsAt) {
      return jsonResponse({ error: 'Thời điểm bắt đầu không hợp lệ.' }, 400);
    }

    if (body.endsAt && !endsAt) {
      return jsonResponse({ error: 'Thời điểm kết thúc không hợp lệ.' }, 400);
    }

    if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      return jsonResponse({ error: 'Thời điểm kết thúc phải sau thời điểm bắt đầu.' }, 400);
    }

    if (!(await canChangeOrganizationRole(actor, roleKey, 'assign'))) {
      return jsonResponse({ error: 'Bạn không có quyền bổ nhiệm chức vụ Đội này.' }, 403);
    }

    await assignOrganizationRole({ actorId: actor.id, userId, roleKey, startsAt, endsAt });
    return jsonResponse({ ok: true }, 201);
  } catch (error) {
    return roleErrorResponse(error, 'Không thể bổ nhiệm chức vụ Đội.');
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<OrganizationRoleBody>(request, 20_000);
    const userId = readString(body.userId);
    const roleKey = body.roleKey;

    if (!userId || !isOrganizationRoleKey(roleKey)) {
      return jsonResponse({ error: 'Dữ liệu kết thúc chức vụ Đội không hợp lệ.' }, 400);
    }

    const endedAt = readOptionalIsoDate(body.endedAt, new Date().toISOString());

    if (!endedAt) {
      return jsonResponse({ error: 'Thời điểm kết thúc không hợp lệ.' }, 400);
    }

    if (!(await canChangeOrganizationRole(actor, roleKey, 'revoke'))) {
      return jsonResponse({ error: 'Bạn không có quyền kết thúc chức vụ Đội này.' }, 403);
    }

    await endOrganizationRoleAssignments({ actorId: actor.id, userId, roleKey, endedAt });
    return jsonResponse({ ok: true });
  } catch (error) {
    return roleErrorResponse(error, 'Không thể kết thúc chức vụ Đội.');
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<OrganizationRoleBody>(request, 20_000);
    const targetUserId = readString(body.targetUserId);

    if (!targetUserId) {
      return jsonResponse({ error: 'Dữ liệu chuyển giao Đội trưởng không hợp lệ.' }, 400);
    }

    if (!(await canTransferCaptain(actor))) {
      return jsonResponse(
        {
          error:
            'Bạn không có quyền chuyển giao Đội trưởng hoặc quyền của bạn chỉ đến từ chức Đội trưởng hiện tại.',
        },
        403,
      );
    }

    await transferOrganizationCaptain({ actorId: actor.id, targetUserId });
    return jsonResponse({ ok: true });
  } catch (error) {
    return roleErrorResponse(error, 'Không thể chuyển giao Đội trưởng.');
  }
}
