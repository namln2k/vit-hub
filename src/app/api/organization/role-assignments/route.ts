import { jsonResponse, readJsonBody } from '@/server/api';
import {
  authorizationErrorResponse,
  hasDomainPermission,
  requireOrganizationActor,
} from '@/features/organization-structure/server/authorization';
import {
  assignScopeRole,
  endScopeRoleAssignments,
  getDeputyRoleKey,
  getLeadRoleKey,
  isManageableScopeType,
  RepositoryConflictError,
} from '@/features/organization-structure/server/adminRepository';
import type { NonEventRoleKey } from '@/features/organization-structure/permissions';

export const runtime = 'nodejs';

interface RoleAssignmentBody {
  scopeType?: unknown;
  scopeId?: unknown;
  userId?: unknown;
  roleKey?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  endedAt?: unknown;
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

function readRoleKey(
  scopeType: 'division' | 'group' | 'club',
  value: unknown,
): NonEventRoleKey | null {
  if (
    typeof value === 'string' &&
    (value === getLeadRoleKey(scopeType) || value === getDeputyRoleKey(scopeType))
  ) {
    return value;
  }

  return null;
}

async function canChangeRole(
  actor: Awaited<ReturnType<typeof requireOrganizationActor>>,
  scopeType: 'division' | 'group' | 'club',
  scopeId: string,
  roleKey: NonEventRoleKey,
  operation: 'assign' | 'revoke',
) {
  const isLeadRole = roleKey === getLeadRoleKey(scopeType);
  const permissionKey = isLeadRole
    ? operation === 'assign'
      ? 'scope.role.assign_lead'
      : 'scope.role.revoke_lead'
    : operation === 'assign'
      ? 'scope.role.assign_deputy'
      : 'scope.role.revoke_deputy';

  return hasDomainPermission(actor, permissionKey, { type: scopeType, id: scopeId });
}

export async function POST(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<RoleAssignmentBody>(request, 20_000);
    const scopeType = body.scopeType;
    const scopeId = readString(body.scopeId);
    const userId = readString(body.userId);

    if (!isManageableScopeType(scopeType) || !scopeId || !userId) {
      return jsonResponse({ error: 'Dữ liệu bổ nhiệm không hợp lệ.' }, 400);
    }

    const roleKey = readRoleKey(scopeType, body.roleKey);

    if (!roleKey) {
      return jsonResponse({ error: 'Vai trò không hợp lệ với scope.' }, 400);
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

    if (!(await canChangeRole(actor, scopeType, scopeId, roleKey, 'assign'))) {
      return jsonResponse({ error: 'Bạn không có quyền bổ nhiệm vai trò này.' }, 403);
    }

    await assignScopeRole({ actorId: actor.id, scopeType, scopeId, userId, roleKey, startsAt, endsAt });
    return jsonResponse({ ok: true }, 201);
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    if (error instanceof RepositoryConflictError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể bổ nhiệm vai trò.' },
      500,
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<RoleAssignmentBody>(request, 20_000);
    const scopeType = body.scopeType;
    const scopeId = readString(body.scopeId);
    const userId = readString(body.userId);

    if (!isManageableScopeType(scopeType) || !scopeId || !userId) {
      return jsonResponse({ error: 'Dữ liệu gỡ vai trò không hợp lệ.' }, 400);
    }

    const roleKey = readRoleKey(scopeType, body.roleKey);

    if (!roleKey) {
      return jsonResponse({ error: 'Vai trò không hợp lệ với scope.' }, 400);
    }

    if (!(await canChangeRole(actor, scopeType, scopeId, roleKey, 'revoke'))) {
      return jsonResponse({ error: 'Bạn không có quyền gỡ vai trò này.' }, 403);
    }

    const endedAt = readOptionalIsoDate(body.endedAt, new Date().toISOString());

    if (!endedAt) {
      return jsonResponse({ error: 'Thời điểm kết thúc không hợp lệ.' }, 400);
    }

    await endScopeRoleAssignments({
      actorId: actor.id,
      scopeType,
      scopeId,
      userIds: [userId],
      roleKeys: [roleKey],
      endedAt,
    });
    return jsonResponse({ ok: true });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể gỡ vai trò.' },
      500,
    );
  }
}
