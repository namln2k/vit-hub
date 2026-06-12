import { jsonResponse, readJsonBody } from '@/server/api';
import {
  authorizationErrorResponse,
  canManageScope,
  requireOrganizationActor,
} from '@/features/organization-structure/server/authorization';
import {
  addScopeMembers,
  endScopeMembers,
  isManageableScopeType,
  listScopeMembers,
  revokeScopeMembers,
} from '@/features/organization-structure/server/adminRepository';

export const runtime = 'nodejs';

interface ScopeMembershipBody {
  scopeType?: unknown;
  scopeId?: unknown;
  userIds?: unknown;
  startsAt?: unknown;
  endedAt?: unknown;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readUserIds(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function readOptionalIsoDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export async function GET(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const { searchParams } = new URL(request.url);
    const scopeType = searchParams.get('scopeType');
    const scopeId = searchParams.get('scopeId') ?? '';

    if (!isManageableScopeType(scopeType) || !scopeId) {
      return jsonResponse({ error: 'Scope không hợp lệ.' }, 400);
    }

    if (!(await canManageScope(actor, { type: scopeType, id: scopeId }))) {
      return jsonResponse({ error: 'Bạn không có quyền xem scope này.' }, 403);
    }

    return jsonResponse({ members: await listScopeMembers(scopeType, scopeId) });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể tải danh sách thành viên.' },
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<ScopeMembershipBody>(request, 20_000);
    const scopeType = body.scopeType;
    const scopeId = readString(body.scopeId);
    const userIds = readUserIds(body.userIds);
    const startsAt = readOptionalIsoDate(body.startsAt);

    if (!isManageableScopeType(scopeType) || !scopeId || userIds.length === 0) {
      return jsonResponse({ error: 'Dữ liệu thêm thành viên không hợp lệ.' }, 400);
    }

    if (startsAt === null) {
      return jsonResponse({ error: 'Thời điểm bắt đầu không hợp lệ.' }, 400);
    }

    if (!(await canManageScope(actor, { type: scopeType, id: scopeId }))) {
      return jsonResponse({ error: 'Bạn không có quyền thêm thành viên.' }, 403);
    }

    await addScopeMembers({ actorId: actor.id, scopeType, scopeId, userIds, startsAt });
    return jsonResponse({ ok: true }, 201);
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể thêm thành viên.' },
      500,
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<ScopeMembershipBody>(request, 20_000);
    const scopeType = body.scopeType;
    const scopeId = readString(body.scopeId);
    const userIds = readUserIds(body.userIds);
    const endedAt = readOptionalIsoDate(body.endedAt);

    if (!isManageableScopeType(scopeType) || !scopeId || userIds.length === 0) {
      return jsonResponse({ error: 'Dữ liệu kết thúc membership không hợp lệ.' }, 400);
    }

    if (endedAt === null) {
      return jsonResponse({ error: 'Thời điểm kết thúc không hợp lệ.' }, 400);
    }

    if (!(await canManageScope(actor, { type: scopeType, id: scopeId }))) {
      return jsonResponse({ error: 'Bạn không có quyền kết thúc membership.' }, 403);
    }

    await endScopeMembers({ actorId: actor.id, scopeType, scopeId, userIds, endedAt });
    return jsonResponse({ ok: true });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể kết thúc membership.' },
      500,
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<ScopeMembershipBody>(request, 20_000);
    const scopeType = body.scopeType;
    const scopeId = readString(body.scopeId);
    const userIds = readUserIds(body.userIds);

    if (!isManageableScopeType(scopeType) || !scopeId || userIds.length === 0) {
      return jsonResponse({ error: 'Dữ liệu thu hồi membership không hợp lệ.' }, 400);
    }

    if (!(await canManageScope(actor, { type: scopeType, id: scopeId }))) {
      return jsonResponse({ error: 'Bạn không có quyền thu hồi membership.' }, 403);
    }

    await revokeScopeMembers({ actorId: actor.id, scopeType, scopeId, userIds });
    return jsonResponse({ ok: true });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể thu hồi membership.' },
      500,
    );
  }
}
