import type {
  EventOwnerScopeRef,
  PermissionKey,
  ScopeRef,
} from '@/features/organization-structure/permissions';
import {
  AuthorizationContext,
  AuthorizationError,
  OrganizationActor,
} from '@/features/organization-structure/server/authorization/types';
import {
  isOrganizationManager,
  isSuperAdmin,
} from '@/features/organization-structure/server/authorization/actor';
import {
  getClubParentDivisionId,
  getEvent,
  isActiveScopeMember,
  isEventParticipant,
  listEventRoles,
  listPermissionGrants,
} from '@/features/organization-structure/server/authorization/data';
import {
  grantMatchesScope,
  isEffectiveActive,
} from '@/features/organization-structure/server/authorization/matching';

export async function hasDomainPermission(
  actor: OrganizationActor,
  permissionKey: PermissionKey,
  targetScope: ScopeRef,
  context: AuthorizationContext = {},
) {
  if (isSuperAdmin(actor)) {
    return true;
  }

  const grants = await listPermissionGrants(
    actor.roleAssignments.map((assignment) => assignment.role_key),
  );
  const now = context.now ?? new Date();
  const targetParentDivisionId =
    targetScope.type === 'club' ? await getClubParentDivisionId(String(targetScope.id)) : null;

  for (const assignment of actor.roleAssignments) {
    if (!isEffectiveActive(assignment, now)) {
      continue;
    }

    const matchingGrants = grants.filter(
      (grant) =>
        grant.role_key === assignment.role_key &&
        grant.permission_key === permissionKey &&
        grant.is_enabled,
    );

    if (
      matchingGrants.some((grant) =>
        grantMatchesScope({
          grant,
          assignment,
          targetScope,
          targetParentDivisionId,
        }),
      )
    ) {
      return true;
    }
  }

  return false;
}

export async function canManageScope(
  actor: OrganizationActor,
  targetScope: ScopeRef,
  context: AuthorizationContext = {},
) {
  if (isSuperAdmin(actor)) {
    return true;
  }

  return hasDomainPermission(actor, 'scope.member.manage', targetScope, context);
}

export async function canViewScopeContact(
  actor: OrganizationActor,
  targetScope: ScopeRef,
  context: AuthorizationContext = {},
) {
  if (isSuperAdmin(actor) || isOrganizationManager(actor)) {
    return true;
  }

  if (await hasDomainPermission(actor, 'scope.member.view_contact', targetScope, context)) {
    return true;
  }

  return isActiveScopeMember(actor.id, targetScope, context);
}

export async function canCreateEventForOwner(
  actor: OrganizationActor,
  ownerScope: EventOwnerScopeRef,
  context: AuthorizationContext = {},
) {
  if (isSuperAdmin(actor)) {
    return true;
  }

  return hasDomainPermission(actor, 'event.create', ownerScope, context);
}

export async function canManageEvent(
  actor: OrganizationActor,
  eventId: string,
  context: AuthorizationContext = {},
) {
  return hasEventPermission(actor, eventId, 'event.manage', context);
}

export async function canViewEventPrivate(
  actor: OrganizationActor,
  eventId: string,
  context: AuthorizationContext = {},
) {
  return hasEventPermission(actor, eventId, 'event.view_private', context);
}

export async function canViewEventBasic(
  actor: OrganizationActor,
  eventId: string,
  context: AuthorizationContext = {},
) {
  if (isSuperAdmin(actor)) {
    return true;
  }

  const event = await getEvent(eventId);

  if (!event) {
    throw new AuthorizationError('Không tìm thấy event.', 404);
  }

  if (event.visibility === 'organization') {
    return true;
  }

  if (await canViewEventPrivate(actor, eventId, context)) {
    return true;
  }

  if (event.visibility === 'scope') {
    return (
      (await isActiveScopeMember(
        actor.id,
        { type: event.owner_scope_type, id: event.owner_scope_id },
        context,
      )) || (await isEventParticipant(actor.id, eventId))
    );
  }

  return false;
}

export async function canManageEventMembers(
  actor: OrganizationActor,
  eventId: string,
  context: AuthorizationContext = {},
) {
  return hasEventPermission(actor, eventId, 'event.member.manage', context);
}

export async function canUpdateEventAttendance(
  actor: OrganizationActor,
  eventId: string,
  context: AuthorizationContext = {},
) {
  return hasEventPermission(actor, eventId, 'event.attendance.update', context);
}

export async function canAssignEventRole(
  actor: OrganizationActor,
  eventId: string,
  context: AuthorizationContext = {},
) {
  return hasEventPermission(actor, eventId, 'event.role.assign', context);
}

export async function canRevokeEventRole(
  actor: OrganizationActor,
  eventId: string,
  context: AuthorizationContext = {},
) {
  return hasEventPermission(actor, eventId, 'event.role.revoke', context);
}

export async function canManageEventLeadWithoutEventRoles(
  actor: OrganizationActor,
  eventId: string,
  permissionKey: 'event.role.assign' | 'event.role.revoke',
  context: AuthorizationContext = {},
) {
  return hasEventPermission(actor, eventId, permissionKey, context, { ignoreEventRoles: true });
}

async function hasEventPermission(
  actor: OrganizationActor,
  eventId: string,
  permissionKey: PermissionKey,
  context: AuthorizationContext = {},
  options: { ignoreEventRoles?: boolean } = {},
) {
  if (isSuperAdmin(actor)) {
    return true;
  }

  const event = await getEvent(eventId);

  if (!event) {
    throw new AuthorizationError('Không tìm thấy event.', 404);
  }

  const eventRoles = options.ignoreEventRoles ? [] : await listEventRoles(eventId, actor.id);
  const grants = await listPermissionGrants(eventRoles.map((assignment) => assignment.role_key));
  const hasOwnedEventGrant = eventRoles.some((assignment) =>
    grants.some(
      (grant) =>
        grant.role_key === assignment.role_key &&
        grant.permission_key === permissionKey &&
        grant.effect_scope === 'owned_event' &&
        grant.is_enabled,
    ),
  );

  if (hasOwnedEventGrant) {
    return true;
  }

  return hasDomainPermission(
    actor,
    permissionKey,
    {
      type: event.owner_scope_type,
      id: event.owner_scope_id,
    },
    context,
  );
}

export async function canManageChildClub(
  actor: OrganizationActor,
  clubId: string,
  permissionKey: PermissionKey,
  context: AuthorizationContext = {},
) {
  return hasDomainPermission(actor, permissionKey, { type: 'club', id: clubId }, context);
}
