import type { UserRole } from '@/constants/userRoles';
import type {
  EffectScope,
  EventOwnerScopeRef,
  EventRoleKey,
  NonEventRoleKey,
  NonEventScopeType,
  PermissionKey,
  UserStatus,
} from '@/features/organization-structure/permissions';

export interface ActorUserRow {
  id: string;
  role: UserRole;
  status: UserStatus;
}

export interface RoleAssignmentRow {
  id: string;
  user_id: string;
  role_key: NonEventRoleKey;
  scope_type: NonEventScopeType;
  scope_id: string | null;
  starts_at: string;
  ends_at: string | null;
  status: 'active' | 'ended' | 'revoked';
}

export interface EventRoleAssignmentRow {
  id: string;
  event_id: string;
  user_id: string;
  role_key: EventRoleKey;
}

export interface PermissionGrantRow {
  role_key: NonEventRoleKey | EventRoleKey;
  permission_key: PermissionKey;
  effect_scope: EffectScope;
  is_enabled: boolean;
}

export interface ClubParentRow {
  id: string;
  division_id: string;
}

export interface EventRow {
  id: string;
  owner_scope_type: EventOwnerScopeRef['type'];
  owner_scope_id: string | null;
  visibility: 'organization' | 'scope' | 'managers';
}

export interface OrganizationActor {
  id: string;
  appRole: UserRole;
  status: UserStatus;
  roleAssignments: RoleAssignmentRow[];
}

export interface AuthorizationContext {
  now?: Date;
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 | 404 | 409 = 403,
  ) {
    super(message);
  }
}
