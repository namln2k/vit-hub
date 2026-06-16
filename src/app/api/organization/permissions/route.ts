import { jsonResponse, readJsonBody } from '@/server/api';
import {
  authorizationErrorResponse,
  hasDomainPermission,
  requireOrganizationActor,
} from '@/features/organization-structure/server/authorization';
import {
  listPermissionMatrix,
  updatePermissionGrant,
} from '@/features/organization-structure/server/adminRepository';
import {
  DOMAIN_ROLE_KEYS,
  EFFECT_SCOPES,
  PERMISSION_KEYS,
  type DomainRoleKey,
  type EffectScope,
  type PermissionKey,
} from '@/features/organization-structure/permissions';

export const runtime = 'nodejs';

interface UpdateGrantBody {
  roleKey?: unknown;
  permissionKey?: unknown;
  effectScope?: unknown;
  isEnabled?: unknown;
}

function includesValue<TValue extends string>(
  values: readonly TValue[],
  value: unknown,
): value is TValue {
  return typeof value === 'string' && values.includes(value as TValue);
}

async function canViewPermissions(actor: Awaited<ReturnType<typeof requireOrganizationActor>>) {
  return hasDomainPermission(actor, 'permission.view', { type: 'organization', id: null });
}

async function canManagePermissions(actor: Awaited<ReturnType<typeof requireOrganizationActor>>) {
  return hasDomainPermission(actor, 'permission.manage', { type: 'organization', id: null });
}

export async function GET(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const [canView, canManage] = await Promise.all([
      canViewPermissions(actor),
      canManagePermissions(actor),
    ]);

    if (!canView) {
      return jsonResponse({ error: 'Bạn không có quyền xem permission matrix.' }, 403);
    }

    const matrix = await listPermissionMatrix();
    return jsonResponse({
      ...matrix,
      capabilities: {
        canManage,
      },
      technicalOverrides: {
        superAdminBypassesMatrix: true,
      },
    });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể tải permission matrix.' },
      500,
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<UpdateGrantBody>(request, 20_000);

    if (!(await canManagePermissions(actor))) {
      return jsonResponse({ error: 'Bạn không có quyền sửa permission matrix.' }, 403);
    }

    if (
      !includesValue(DOMAIN_ROLE_KEYS, body.roleKey) ||
      !includesValue(PERMISSION_KEYS, body.permissionKey) ||
      !includesValue(EFFECT_SCOPES, body.effectScope) ||
      typeof body.isEnabled !== 'boolean'
    ) {
      return jsonResponse({ error: 'Permission grant không hợp lệ.' }, 400);
    }

    await updatePermissionGrant({
      actorId: actor.id,
      roleKey: body.roleKey as DomainRoleKey,
      permissionKey: body.permissionKey as PermissionKey,
      effectScope: body.effectScope as EffectScope,
      isEnabled: body.isEnabled,
    });
    return jsonResponse({ ok: true });
  } catch (error) {
    const authResponse = authorizationErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể cập nhật permission grant.' },
      500,
    );
  }
}
