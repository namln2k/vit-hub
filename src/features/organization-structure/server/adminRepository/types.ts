import type { UserRole } from '@/constants/userRoles';
import type {
  DomainRoleKey,
  EffectScope,
  EventMembershipStatus,
  EventOwnerScopeType,
  EventRoleKey,
  EventVisibility,
  NonEventRoleKey,
  PermissionKey,
} from '@/features/organization-structure/permissions';

export type ManageableScopeType = 'division' | 'group' | 'club';

export interface MembershipRow {
  id: string;
  user_id: string;
  starts_at: string;
  ends_at: string | null;
  status: 'active' | 'ended' | 'revoked';
  source: 'manual' | 'role_assignment_auto';
  added_by: string | null;
  ended_by: string | null;
  revoked_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  nickname: string | null;
  username: string;
  phone_number: string | null;
  school_name: string | null;
  enter_year: string | null;
  cohort: string | null;
  gender: 0 | 1 | null;
  avatar_url: string | null;
  avatar_key: string | null;
  role: UserRole;
  status: 'active' | 'disabled';
}

export interface RoleAssignmentSummary {
  id: string;
  userId: string;
  roleKey: NonEventRoleKey;
  scopeType: 'organization' | ManageableScopeType | 'club';
  scopeId: string | null;
  startsAt: string;
  endsAt: string | null;
  status: 'active' | 'ended' | 'revoked';
  assignedBy: LifecycleActorSummary | null;
  endedBy: LifecycleActorSummary | null;
  revokedBy: LifecycleActorSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface LifecycleActorSummary {
  id: string;
  name: string;
  email: string;
}

export interface RoleAssignmentRow {
  id: string;
  user_id: string;
  role_key: NonEventRoleKey;
  scope_type: RoleAssignmentSummary['scopeType'];
  scope_id: string | null;
  starts_at: string;
  ends_at: string | null;
  status: 'active' | 'ended' | 'revoked';
  assigned_by: string | null;
  ended_by: string | null;
  revoked_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClubRow {
  id: string;
  division_id: string;
  name: string;
  description: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DivisionRow {
  id: string;
  name: string;
}

export interface GroupRow {
  id: string;
  name: string;
}

export interface RoleRow {
  key: DomainRoleKey;
  scope_type: string;
  label: string;
}

export interface PermissionRow {
  key: PermissionKey;
  label: string;
  description: string;
}

export interface PermissionGrantRow {
  role_key: DomainRoleKey;
  permission_key: PermissionKey;
  effect_scope: EffectScope;
  is_enabled: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface EventRow {
  id: string;
  name: string;
  owner_scope_type: EventOwnerScopeType;
  owner_scope_id: string | null;
  visibility: EventVisibility;
  show_participants_publicly: boolean;
  starts_at: string;
  ends_at: string | null;
  public_location: string | null;
  public_description: string | null;
  internal_notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventMembershipRow {
  id: string;
  event_id: string;
  user_id: string;
  status: EventMembershipStatus;
  created_at: string;
  updated_at: string;
}

export interface EventRoleAssignmentRow {
  id: string;
  event_id: string;
  user_id: string;
  role_key: EventRoleKey;
  assigned_by: string | null;
  assigned_at: string;
}

export interface OrganizationMemberSummary {
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
  role: UserRole;
  status: 'active' | 'disabled';
  membership: {
    id: string;
    startsAt: string;
    endsAt: string | null;
    status: 'active' | 'ended' | 'revoked';
    source: 'manual' | 'role_assignment_auto';
    addedBy: LifecycleActorSummary | null;
    endedBy: LifecycleActorSummary | null;
    revokedBy: LifecycleActorSummary | null;
    createdAt: string;
    updatedAt: string;
  };
  roleAssignments: RoleAssignmentSummary[];
}

export interface PermissionMatrix {
  roles: Array<{ key: DomainRoleKey; scopeType: string; label: string }>;
  permissions: Array<{ key: PermissionKey; label: string; description: string }>;
  grants: Array<{
    roleKey: DomainRoleKey;
    permissionKey: PermissionKey;
    effectScope: EffectScope;
    isEnabled: boolean;
    updatedBy: string | null;
    updatedAt: string;
  }>;
}

export interface ClubSummary {
  id: string;
  divisionId: string;
  divisionName: string;
  name: string;
  description: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  leads: Array<{ userId: string; name: string; email: string }>;
  deputies: Array<{ userId: string; name: string; email: string }>;
}

export interface EventSummary {
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

export interface EventRoleAssignmentSummary {
  id: string;
  eventId: string;
  userId: string;
  roleKey: EventRoleKey;
  assignedBy: string | null;
  assignedAt: string;
}

export interface EventParticipantSummary {
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
  role: UserRole;
  status: 'active' | 'disabled';
  membership: {
    id: string;
    eventId: string;
    status: EventMembershipStatus;
    createdAt: string;
    updatedAt: string;
  };
  roleAssignments: EventRoleAssignmentSummary[];
}

export interface EventWriteInput {
  name: string;
  visibility: EventVisibility;
  showParticipantsPublicly: boolean;
  startsAt: string;
  endsAt: string | null;
  publicLocation: string;
  publicDescription: string;
  internalNotes: string;
}

export type OrganizationRoleKey = 'captain' | 'vice_captain';

export interface OrganizationRoleAssignmentSummary extends RoleAssignmentSummary {
  roleKey: OrganizationRoleKey;
  user: {
    id: string;
    email: string;
    name: string;
    username: string;
    avatarUrl: string;
    appRole: UserRole;
    status: 'active' | 'disabled';
  };
}

export interface OrganizationTechnicalAdminSummary {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl: string;
  hasCaptainAssignment: boolean;
  hasViceCaptainAssignment: boolean;
}

export class RepositoryConflictError extends Error {
  readonly status = 409;
}

export class RepositoryForbiddenError extends Error {
  readonly status = 403;
}
