import type { NonEventRoleKey } from '@/features/organization-structure/permissions';
import { apiFetch } from '@/services/organizationAdmin/http';
import type { ManageableScopeType } from '@/services/organizationAdmin/types';

const ROLE_ASSIGNMENTS_API = '/api/organization/role-assignments';

export async function assignScopeRole(
  scopeType: ManageableScopeType,
  scopeId: string,
  userId: string,
  roleKey: NonEventRoleKey,
  startsAt?: string,
  endsAt?: string | null,
) {
  await apiFetch(ROLE_ASSIGNMENTS_API, {
    method: 'POST',
    body: { scopeType, scopeId, userId, roleKey, startsAt, endsAt },
  });
}

export async function removeScopeRole(
  scopeType: ManageableScopeType,
  scopeId: string,
  userId: string,
  roleKey: NonEventRoleKey,
  endedAt?: string,
) {
  await apiFetch(ROLE_ASSIGNMENTS_API, {
    method: 'DELETE',
    body: { scopeType, scopeId, userId, roleKey, endedAt },
  });
}

export async function transferScopeLead(
  scopeType: ManageableScopeType,
  scopeId: string,
  targetUserId: string,
) {
  await apiFetch(ROLE_ASSIGNMENTS_API, {
    method: 'PATCH',
    body: { scopeType, scopeId, targetUserId },
  });
}
