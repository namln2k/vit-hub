import type { NonEventRoleKey } from '@/features/organization-structure/permissions';
import type { ManageableScopeType, OrganizationMember } from '@/services/organizationAdmin';

export interface ScopeMembersTableProps {
  scopeType: ManageableScopeType;
  users: OrganizationMember[];
  isLoading: boolean;
  error: string;
  canManage: boolean;
  canViewContact: boolean;
  selectedUserIdSet: Set<string>;
  accent: 'indigo' | 'emerald' | 'cyan';
  onToggleUser: (userId: string) => void;
  onToggleVisibleUsers: () => void;
  onAssignRole: (
    userId: string,
    roleKey: NonEventRoleKey,
    startsAt: string,
    endsAt: string | null,
  ) => Promise<void>;
  onRemoveRole: (userId: string, roleKey: NonEventRoleKey, endedAt: string) => Promise<void>;
  onRevokeMembership: (userId: string) => void;
  onTransferLead: (targetUserId: string) => Promise<void>;
}

export type RoleActionDialogState = {
  mode: 'assign' | 'end';
  user: OrganizationMember;
  roleKey: NonEventRoleKey;
} | null;
