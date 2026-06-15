import { supabase } from '@/services/supabase';
import type {
  DomainRoleKey,
  EffectScope,
  EventOwnerScopeType,
  EventVisibility,
  NonEventRoleKey,
  PermissionKey,
} from '@/features/organization-structure/permissions';

export type ManageableScopeType = 'division' | 'group' | 'club';
export type OrganizationRoleKey = 'captain' | 'vice_captain';

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

export interface OrganizationRoleAssignmentDetail extends OrganizationRoleAssignment {
  roleKey: OrganizationRoleKey;
  user: {
    id: string;
    email: string;
    name: string;
    username: string;
    avatarUrl: string;
    appRole: 'member' | 'super_admin';
    status: 'active' | 'disabled';
  };
}

export interface OrganizationTechnicalAdmin {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl: string;
  hasCaptainAssignment: boolean;
  hasViceCaptainAssignment: boolean;
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

export interface OrganizationEvent {
  id: string;
  name: string;
  ownerScopeType: EventOwnerScopeType;
  ownerScopeId: string | null;
  ownerScopeName: string;
  visibility: EventVisibility;
  showParticipantsPublicly: boolean;
  startsAt: string;
  endsAt: string | null;
  publicLocation: string;
  publicDescription: string;
  internalNotes: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationEventWriteInput {
  name: string;
  visibility: EventVisibility;
  showParticipantsPublicly: boolean;
  startsAt: string;
  endsAt: string | null;
  publicLocation: string;
  publicDescription: string;
  internalNotes: string;
}

export interface OrganizationEventCreateInput extends OrganizationEventWriteInput {
  ownerScopeType: EventOwnerScopeType;
  ownerScopeId: string | null;
}

const SCOPE_MEMBERSHIPS_API = '/api/organization/scope-memberships';
const ROLE_ASSIGNMENTS_API = '/api/organization/role-assignments';
const ORGANIZATION_ROLES_API = '/api/organization/organization-roles';
const PERMISSIONS_API = '/api/organization/permissions';
const EVENTS_API = '/api/organization/events';

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

export async function listOrganizationRoles() {
  return apiFetch<{
    assignments: OrganizationRoleAssignmentDetail[];
    technicalAdmins: OrganizationTechnicalAdmin[];
  }>(ORGANIZATION_ROLES_API);
}

export async function assignOrganizationRole(
  userId: string,
  roleKey: OrganizationRoleKey,
  startsAt?: string,
  endsAt?: string | null,
) {
  await apiFetch(ORGANIZATION_ROLES_API, {
    method: 'POST',
    body: { userId, roleKey, startsAt, endsAt },
  });
}

export async function endOrganizationRole(
  userId: string,
  roleKey: OrganizationRoleKey,
  endedAt?: string,
) {
  await apiFetch(ORGANIZATION_ROLES_API, {
    method: 'DELETE',
    body: { userId, roleKey, endedAt },
  });
}

export async function transferOrganizationCaptain(targetUserId: string) {
  await apiFetch(ORGANIZATION_ROLES_API, {
    method: 'PATCH',
    body: { targetUserId },
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

export async function listOrganizationEvents() {
  const result = await apiFetch<{ events: OrganizationEvent[] }>(EVENTS_API);

  return result.events;
}

export async function createOrganizationEvent(input: OrganizationEventCreateInput) {
  const result = await apiFetch<{ event: OrganizationEvent }>(EVENTS_API, {
    method: 'POST',
    body: input,
  });

  return result.event;
}

export async function updateOrganizationEvent(eventId: string, input: OrganizationEventWriteInput) {
  const result = await apiFetch<{ event: OrganizationEvent }>(EVENTS_API, {
    method: 'PATCH',
    body: { id: eventId, ...input },
  });

  return result.event;
}

export async function deleteOrganizationEvent(eventId: string) {
  await apiFetch(EVENTS_API, {
    method: 'DELETE',
    body: { id: eventId },
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

export function formatTransferLeadApiError(error: unknown, fallback: string) {
  return formatApiError(error, fallback, [403, 409]);
}

export function formatOrganizationRoleApiError(error: unknown, fallback: string) {
  return formatApiError(error, fallback, [403, 409]);
}

function formatApiError(error: unknown, fallback: string, visibleStatuses: number[]) {
  const message = error instanceof Error ? error.message : fallback;

  if (error instanceof ApiError && visibleStatuses.includes(error.status)) {
    return `${error.status} ${getHttpStatusLabel(error.status)}: ${message}`;
  }

  return message;
}

function getHttpStatusLabel(status: number) {
  if (status === 403) {
    return 'Forbidden';
  }

  if (status === 409) {
    return 'Conflict';
  }

  return 'Error';
}
