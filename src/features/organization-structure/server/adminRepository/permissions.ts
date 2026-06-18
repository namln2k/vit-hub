import { supabaseFetch } from '@/server/supabase';
import type {
  DomainRoleKey,
  EffectScope,
  PermissionKey,
} from '@/features/organization-structure/permissions';
import {
  PermissionGrantRow,
  PermissionMatrix,
  PermissionRow,
  RoleRow,
} from '@/features/organization-structure/server/adminRepository/types';
import { getRestErrorMessage } from '@/features/organization-structure/server/adminRepository/errors';

export async function listPermissionMatrix(): Promise<PermissionMatrix> {
  const [rolesResult, permissionsResult, grantsResult] = await Promise.all([
    supabaseFetch<RoleRow[]>('/rest/v1/roles?select=key,scope_type,label&order=scope_type.asc'),
    supabaseFetch<PermissionRow[]>(
      '/rest/v1/permissions?select=key,label,description&order=key.asc',
    ),
    supabaseFetch<PermissionGrantRow[]>(
      '/rest/v1/role_permission_grants?select=role_key,permission_key,effect_scope,is_enabled,updated_by,updated_at&order=role_key.asc',
    ),
  ]);

  if (!rolesResult.response.ok || !permissionsResult.response.ok || !grantsResult.response.ok) {
    throw new Error('Không thể tải permission matrix.');
  }

  return {
    roles: (Array.isArray(rolesResult.data) ? rolesResult.data : []).map((role) => ({
      key: role.key,
      scopeType: role.scope_type,
      label: role.label,
    })),
    permissions: (Array.isArray(permissionsResult.data) ? permissionsResult.data : []).map(
      (permission) => ({
        key: permission.key,
        label: permission.label,
        description: permission.description,
      }),
    ),
    grants: (Array.isArray(grantsResult.data) ? grantsResult.data : []).map((grant) => ({
      roleKey: grant.role_key,
      permissionKey: grant.permission_key,
      effectScope: grant.effect_scope,
      isEnabled: grant.is_enabled,
      updatedBy: grant.updated_by,
      updatedAt: grant.updated_at,
    })),
  };
}

export async function updatePermissionGrant({
  actorId,
  roleKey,
  permissionKey,
  effectScope,
  isEnabled,
}: {
  actorId: string;
  roleKey: DomainRoleKey;
  permissionKey: PermissionKey;
  effectScope: EffectScope;
  isEnabled: boolean;
}) {
  const query = new URLSearchParams({
    role_key: `eq.${roleKey}`,
    permission_key: `eq.${permissionKey}`,
    effect_scope: `eq.${effectScope}`,
  });
  const { response, data } = await supabaseFetch(
    `/rest/v1/role_permission_grants?${query.toString()}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: {
        is_enabled: isEnabled,
        updated_by: actorId,
        updated_at: new Date().toISOString(),
      },
    },
  );

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể cập nhật permission grant.'));
  }
}
