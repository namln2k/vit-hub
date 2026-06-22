import { jsonResponse, readJsonBody } from '@/server/api';
import {
  authorizationErrorResponse,
  canManageScope,
  requireOrganizationActor,
} from '@/features/organization-structure/server/authorization';
import {
  archiveScope,
  isManageableScopeType,
  RepositoryConflictError,
} from '@/features/organization-structure/server/adminRepository';

export const runtime = 'nodejs';

interface ScopeLifecycleBody {
  scopeType?: unknown;
  scopeId?: unknown;
  archivedAt?: unknown;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readOptionalIsoDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return new Date().toISOString();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<ScopeLifecycleBody>(request, 20_000);
    const scopeType = body.scopeType;
    const scopeId = readString(body.scopeId);
    const archivedAt = readOptionalIsoDate(body.archivedAt);

    if (!isManageableScopeType(scopeType) || !scopeId) {
      return jsonResponse({ error: 'Scope không hợp lệ.' }, 400);
    }

    if (!archivedAt) {
      return jsonResponse({ error: 'Thời điểm lưu trữ không hợp lệ.' }, 400);
    }

    if (!(await canManageScope(actor, { type: scopeType, id: scopeId }))) {
      return jsonResponse({ error: 'Bạn không có quyền lưu trữ scope này.' }, 403);
    }

    await archiveScope({ actorId: actor.id, scopeType, scopeId, archivedAt });
    return jsonResponse({ ok: true });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    if (error instanceof RepositoryConflictError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể lưu trữ scope.' },
      500,
    );
  }
}
