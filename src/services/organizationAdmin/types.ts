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
  assignedBy: LifecycleActor | null;
  endedBy: LifecycleActor | null;
  revokedBy: LifecycleActor | null;
  createdAt: string;
  updatedAt: string;
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
  email?: string | null;
}

export interface OrganizationMember {
  uid: string;
  email?: string | null;
  firstName: string;
  lastName: string;
  middleName: string;
  nickname: string;
  username: string;
  phoneNumber?: string | null;
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
    createdAt: string;
    updatedAt: string;
  };
  roleAssignments: OrganizationRoleAssignment[];
}

export interface ScopeMemberCapabilities {
  canManage: boolean;
  canViewContact: boolean;
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
  capabilities: {
    canManage: boolean;
  };
  technicalOverrides: {
    superAdminBypassesMatrix: boolean;
  };
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

export interface OrganizationEventRoleAssignment {
  id: string;
  eventId: string;
  userId: string;
  roleKey: EventRoleKey;
  assignedBy: string | null;
  assignedAt: string;
}

export interface OrganizationEventParticipant {
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
    eventId: string;
    status: EventMembershipStatus;
    createdAt: string;
    updatedAt: string;
  };
  roleAssignments: OrganizationEventRoleAssignment[];
}

export interface OrganizationEventParticipantCapabilities {
  canManage: boolean;
  canManageMembers: boolean;
  canAssignRoles: boolean;
  canRevokeRoles: boolean;
  canUpdateAttendance: boolean;
}

export interface OrganizationEventPublicParticipant {
  uid: string;
  firstName: string;
  lastName: string;
  middleName: string;
  nickname: string;
  username: string;
  avatarUrl: string;
  roleAssignments: Array<
    Pick<OrganizationEventRoleAssignment, 'id' | 'eventId' | 'userId' | 'roleKey'>
  >;
}

export interface OrganizationEventBasicDetail {
  event: OrganizationEvent;
  participants: Array<OrganizationEventParticipant | OrganizationEventPublicParticipant>;
  capabilities: {
    canViewPrivate: boolean;
    canShowParticipants: boolean;
  };
}
