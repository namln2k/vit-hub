import { jsonResponse, readJsonBody } from '@/server/api';
import {
  authorizationErrorResponse,
  canManageScope,
  requireOrganizationActor,
} from '@/features/organization-structure/server/authorization';
import {
  archiveClub,
  createClub,
  getClub,
  listClubs,
  RepositoryConflictError,
  updateClub,
} from '@/features/organization-structure/server/adminRepository';

export const runtime = 'nodejs';

interface ClubBody {
  id?: unknown;
  divisionId?: unknown;
  name?: unknown;
  description?: unknown;
  archived?: unknown;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function GET(request: Request) {
  try {
    await requireOrganizationActor(request);
    return jsonResponse({ clubs: await listClubs() });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể tải danh sách CLB/tổ.' },
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<ClubBody>(request, 20_000);
    const divisionId = readString(body.divisionId);
    const name = readString(body.name);
    const description = readString(body.description);

    if (!divisionId || !name) {
      return jsonResponse({ error: 'Tên và mảng parent là bắt buộc.' }, 400);
    }

    if (!(await canManageScope(actor, { type: 'division', id: divisionId }))) {
      return jsonResponse({ error: 'Bạn không có quyền tạo CLB/tổ trong mảng này.' }, 403);
    }

    const club = await createClub({ actorId: actor.id, divisionId, name, description });
    return jsonResponse({ club }, 201);
  } catch (error) {
    const knownResponse = knownErrorResponse(error);

    if (knownResponse) {
      return knownResponse;
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể tạo CLB/tổ.' },
      500,
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<ClubBody>(request, 20_000);
    const clubId = readString(body.id);

    if (!clubId) {
      return jsonResponse({ error: 'CLB/tổ không hợp lệ.' }, 400);
    }

    const currentClub = await getClub(clubId);

    if (!currentClub) {
      return jsonResponse({ error: 'Không tìm thấy CLB/tổ.' }, 404);
    }

    const canManageCurrentClub =
      (await canManageScope(actor, { type: 'club', id: clubId })) ||
      (await canManageScope(actor, { type: 'division', id: currentClub.divisionId }));

    if (!canManageCurrentClub) {
      return jsonResponse({ error: 'Bạn không có quyền cập nhật CLB/tổ này.' }, 403);
    }

    if (body.archived === true) {
      const club = await archiveClub({ actorId: actor.id, clubId });
      return jsonResponse({ club });
    }

    const divisionId = readString(body.divisionId);
    const name = readString(body.name);
    const description = readString(body.description);

    if (!divisionId || !name) {
      return jsonResponse({ error: 'Tên và mảng parent là bắt buộc.' }, 400);
    }

    if (
      divisionId !== currentClub.divisionId &&
      !(await canManageScope(actor, { type: 'division', id: divisionId }))
    ) {
      return jsonResponse({ error: 'Bạn không có quyền chuyển CLB/tổ sang mảng này.' }, 403);
    }

    const club = await updateClub({ actorId: actor.id, clubId, divisionId, name, description });
    return jsonResponse({ club });
  } catch (error) {
    const knownResponse = knownErrorResponse(error);

    if (knownResponse) {
      return knownResponse;
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể cập nhật CLB/tổ.' },
      500,
    );
  }
}

function knownErrorResponse(error: unknown) {
  const authResponse = authorizationErrorResponse(error);

  if (authResponse) {
    return authResponse;
  }

  if (error instanceof RepositoryConflictError) {
    return jsonResponse({ error: error.message }, error.status);
  }

  return null;
}
