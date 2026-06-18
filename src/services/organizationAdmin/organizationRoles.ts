import { apiFetch } from '@/services/organizationAdmin/http';
import type {
  OrganizationRoleAssignmentDetail,
  OrganizationRoleKey,
  OrganizationTechnicalAdmin,
} from '@/services/organizationAdmin/types';

const ORGANIZATION_ROLES_API = '/api/organization/organization-roles';

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
