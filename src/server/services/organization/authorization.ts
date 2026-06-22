import 'server-only';

import {
  organizationAuthorizationRepository,
  type OrganizationAuthorizationRepository,
  type RoleAssignmentRecord,
} from '@/server/repositories/organization/authorizationRepository';
import { userRepository, type UserRepository } from '@/server/repositories/users/userRepository';
import { AuthenticationRequiredError, ForbiddenError } from '@/server/services/shared/errors';
import type { Actor } from '@/server/services/shared/actor';
import type { PermissionKey, ScopeRef } from '@/features/organization-structure/permissions';

interface AuthorizationDependencies {
  users: Pick<UserRepository, 'findAccountById'>;
  organization: OrganizationAuthorizationRepository;
  now(): Date;
}

const defaultDependencies: AuthorizationDependencies = {
  users: userRepository,
  organization: organizationAuthorizationRepository,
  now: () => new Date(),
};

export function createOrganizationAuthorization(
  dependencies: AuthorizationDependencies = defaultDependencies,
) {
  async function loadAuthorization(actor: Actor) {
    const account = await dependencies.users.findAccountById(actor.userId);

    if (!account) {
      throw new AuthenticationRequiredError('Không tìm thấy tài khoản ứng dụng.');
    }

    if (account.status !== 'active') {
      throw new ForbiddenError('Tài khoản đã bị vô hiệu hóa.');
    }

    if (account.role === 'super_admin') {
      return { isSuperAdmin: true as const, assignments: [], grants: [] };
    }

    const assignments = (await dependencies.organization.listRoleAssignments(actor.userId)).filter(
      (assignment) => isEffectiveAssignment(assignment, dependencies.now()),
    );
    const grants = await dependencies.organization.listPermissionGrants(
      assignments.map((assignment) => assignment.roleKey),
    );

    return { isSuperAdmin: false as const, assignments, grants };
  }

  async function hasScopePermission(
    actor: Actor,
    permissionKey: PermissionKey,
    targetScope: ScopeRef,
  ) {
    const authorizationContext = await loadAuthorization(actor);

    if (authorizationContext.isSuperAdmin) {
      return true;
    }

    const targetParentDivisionId =
      targetScope.type === 'club'
        ? await dependencies.organization.findClubParentDivisionId(targetScope.id ?? '')
        : null;

    return authorizationContext.assignments.some((assignment) =>
      authorizationContext.grants.some(
        (grant) =>
          grant.isEnabled &&
          grant.roleKey === assignment.roleKey &&
          grant.permissionKey === permissionKey &&
          grantMatchesScope(assignment, grant.effectScope, targetScope, targetParentDivisionId),
      ),
    );
  }

  async function requireScopePermission(
    actor: Actor,
    permissionKey: PermissionKey,
    targetScope: ScopeRef,
  ) {
    if (!(await hasScopePermission(actor, permissionKey, targetScope))) {
      throw new ForbiddenError();
    }
  }

  return {
    async requireOrganizationPermission(actor: Actor, permissionKey: PermissionKey) {
      await requireScopePermission(actor, permissionKey, { type: 'organization', id: null });
    },
    hasScopePermission,
    requireScopePermission,
  };
}

export const organizationAuthorization = createOrganizationAuthorization();

function isEffectiveAssignment(assignment: RoleAssignmentRecord, now: Date) {
  if (assignment.status !== 'active') {
    return false;
  }

  const startsAt = new Date(assignment.startsAt);
  const endsAt = assignment.endsAt ? new Date(assignment.endsAt) : null;
  return startsAt <= now && (!endsAt || now < endsAt);
}

function grantMatchesScope(
  assignment: RoleAssignmentRecord,
  effectScope: 'self_scope' | 'child_club' | 'organization' | 'owned_event',
  targetScope: ScopeRef,
  targetParentDivisionId: string | null,
) {
  if (effectScope === 'organization') {
    return true;
  }

  if (effectScope === 'self_scope') {
    return assignment.scopeType === targetScope.type && assignment.scopeId === targetScope.id;
  }

  if (effectScope === 'child_club') {
    return (
      targetScope.type === 'club' &&
      assignment.scopeType === 'division' &&
      assignment.scopeId === targetParentDivisionId
    );
  }

  return false;
}
