import { jsonResponse, readJsonBody } from '@/server/api';
import {
  authorizationErrorResponse,
  hasDomainPermission,
  requireOrganizationActor,
} from '@/features/organization-structure/server/authorization';
import { supabaseFetch } from '@/server/supabase';
import type { UserStatus } from '@/features/organization-structure/permissions';

export const runtime = 'nodejs';

interface UserStatusBody {
  status?: unknown;
}

function readUserStatus(value: unknown): UserStatus | null {
  return value === 'active' || value === 'disabled' ? value : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const actor = await requireOrganizationActor(request);
    const { userId } = await context.params;
    const body = await readJsonBody<UserStatusBody>(request, 20_000);
    const status = readUserStatus(body.status);

    if (!userId || !status) {
      return jsonResponse({ error: 'Dữ liệu trạng thái user không hợp lệ.' }, 400);
    }

    if (
      !(await hasDomainPermission(actor, 'scope.member.manage', {
        type: 'organization',
        id: null,
      }))
    ) {
      return jsonResponse({ error: 'Bạn không có quyền cập nhật trạng thái nhân sự.' }, 403);
    }

    const query = new URLSearchParams({ id: `eq.${userId}` });
    const { response, data } = await supabaseFetch(`/rest/v1/user?${query.toString()}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: {
        status,
        updated_at: new Date().toISOString(),
      },
    });

    if (!response.ok) {
      return jsonResponse(
        {
          error:
            data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
              ? data.message
              : 'Không thể cập nhật trạng thái nhân sự.',
        },
        500,
      );
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể cập nhật trạng thái nhân sự.' },
      500,
    );
  }
}
