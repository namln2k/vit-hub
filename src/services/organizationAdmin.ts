import { supabase } from '@/services/supabase';
import type {
  DomainRoleKey,
  EffectScope,
  NonEventRoleKey,
  PermissionKey,
} from '@/features/organization-structure/permissions';

export type ManageableScopeType = 'division' | 'group' | 'club';

export interface OrganizationRoleAssignment {
  id: string;
  userId: string;
  roleKey: NonEventRoleKey;
  scopeType: 'organization' | ManageableScopeType | 'club';
  scopeId: string | null;
  startsAt: string;
  endsAt: string | null;
  status: 'active' | 'ended' | 'revoked';
}

export interface LifecycleActor {
  id: string;
  name: string;
  email: string;
}

export interface OrganizationMember {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  nickname: string;
  username: string;
  phoneNumber: string;
  schoolName: string;
  enterYear: string;
  cohort: string;
  gender: 0 | 1 | null;
  avatarUrl: string;
  avatarKey: string;
  role: 'member' | 'super_admin';
  status: 'active' | 'disabled';
  membership: {
    id: string;
    startsAt: string;
    endsAt: string | null;
    status: 'active' | 'ended' | 'revoked';
    source: 'manual' | 'role_assignment_auto';
    addedBy: LifecycleActor | null;
    endedBy: LifecycleActor | null;
    revokedBy: LifecycleActor | null;
  };
  roleAssignments: OrganizationRoleAssignment[];
}

export interface PermissionMatrix {
  roles: Array<{ key: DomainRoleKey; scopeType: string; label: string }>;
  permissions: Array<{ key: PermissionKey; label: string; description: string }>;
  grants: Array<{
    roleKey: DomainRoleKey;
    permissionKey: PermissionKey;
    effectScope: EffectScope;
    isEnabled: boolean;
    updatedAt: string;
  }>;
}

const SCOPE_MEMBERSHIPS_API = '/api/organization/scope-memberships';
const ROLE_ASSIGNMENTS_API = '/api/organization/role-assignments';
const PERMISSIONS_API = '/api/organization/permissions';

export async function listScopeMembers(scopeType: ManageableScopeType, scopeId: string) {
  const params = new URLSearchParams({ scopeType, scopeId });
  const result = await apiFetch<{ members: OrganizationMember[] }>(
    `${SCOPE_MEMBERSHIPS_API}?${params.toString()}`,
  );

  return result.members;
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

async function apiFetch<T = { ok: boolean }>(
  input: RequestInfo | URL,
  init: Omit<RequestInit, 'body'> & { body?: unknown } = {},
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Bạn cần đăng nhập để thực hiện thao tác này.');
  }

  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const result = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new ApiError(result.error ?? 'Không thể thực hiện thao tác.', response.status);
  }

  return result;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
