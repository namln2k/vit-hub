import type {
  DomainRoleKey,
  EffectScope,
  PermissionKey,
} from '@/features/organization-structure/permissions';
import { apiFetch } from '@/services/organizationAdmin/http';
import type { PermissionMatrix } from '@/services/organizationAdmin/types';

const PERMISSIONS_API = '/api/organization/permissions';

export async function listPermissionMatrix() {
  return apiFetch<PermissionMatrix>(PERMISSIONS_API);
}

export async function updatePermissionGrant(
  roleKey: DomainRoleKey,
  permissionKey: PermissionKey,
  effectScope: EffectScope,
  isEnabled: boolean,
) {
  await apiFetch(PERMISSIONS_API, {
    method: 'PATCH',
    body: { roleKey, permissionKey, effectScope, isEnabled },
  });
}
