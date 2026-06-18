import { apiFetch } from '@/services/organizationAdmin/http';
import type {
  ManageableScopeType,
  OrganizationMember,
  ScopeMemberCapabilities,
} from '@/services/organizationAdmin/types';

const SCOPE_MEMBERSHIPS_API = '/api/organization/scope-memberships';
const SCOPE_LIFECYCLE_API = '/api/organization/scope-lifecycle';

export async function listScopeMembers(scopeType: ManageableScopeType, scopeId: string) {
  const params = new URLSearchParams({ scopeType, scopeId });
  const result = await apiFetch<{
    members: OrganizationMember[];
    capabilities?: ScopeMemberCapabilities;
  }>(`${SCOPE_MEMBERSHIPS_API}?${params.toString()}`);

  return result.members;
}

export async function listScopeMembersWithCapabilities(
  scopeType: ManageableScopeType,
  scopeId: string,
) {
  const params = new URLSearchParams({ scopeType, scopeId });
  return apiFetch<{
    members: OrganizationMember[];
    capabilities: ScopeMemberCapabilities;
  }>(`${SCOPE_MEMBERSHIPS_API}?${params.toString()}`);
}

export async function addScopeMembers(
  scopeType: ManageableScopeType,
  scopeId: string,
  userIds: string[],
  startsAt?: string,
) {
  await apiFetch(SCOPE_MEMBERSHIPS_API, {
    method: 'POST',
    body: { scopeType, scopeId, userIds, startsAt },
  });
}

export async function removeScopeMembers(
  scopeType: ManageableScopeType,
  scopeId: string,
  userIds: string[],
  endedAt?: string,
) {
  await apiFetch(SCOPE_MEMBERSHIPS_API, {
    method: 'DELETE',
    body: { scopeType, scopeId, userIds, endedAt },
  });
}

export async function revokeScopeMembers(
  scopeType: ManageableScopeType,
  scopeId: string,
  userIds: string[],
) {
  await apiFetch(SCOPE_MEMBERSHIPS_API, {
    method: 'PATCH',
    body: { scopeType, scopeId, userIds },
  });
}

export async function archiveOrganizationScope(
  scopeType: ManageableScopeType,
  scopeId: string,
  archivedAt: string,
) {
  await apiFetch(SCOPE_LIFECYCLE_API, {
    method: 'PATCH',
    body: { scopeType, scopeId, archivedAt },
  });
}
