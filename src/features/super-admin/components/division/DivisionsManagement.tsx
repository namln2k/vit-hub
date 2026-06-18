import {
  archiveDivision,
  listDivisionMembersWithCapabilities,
  removeUsersFromDivision,
  revokeUsersFromDivision,
  type Division,
} from '@/services/divisions';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminContentPanel from '@/features/super-admin/components/common/AdminContentPanel';
import ArchiveScopeModal from '@/features/super-admin/components/common/ArchiveScopeModal';
import { ADMIN_SECTIONS } from '@/features/super-admin/constants/adminSections';
import ConfirmRemoveUsersModal from '@/features/super-admin/components/common/ConfirmRemoveUsersModal';
import {
  fromVietnamDateTimeLocalValue,
  toVietnamDateTimeLocalValue,
} from '@/features/super-admin/lib/vietnamDateTime';
import {
  getFullName,
  getSearchableUserValues,
  normalizeSearchValue,
} from '@/features/super-admin/lib/userUtils';
import AddDivisionUsersModal from './AddDivisionUsersModal';
import DivisionPanelActions from './DivisionPanelActions';
import DivisionsTable from './DivisionsTable';
import ScopeMembersTable from '@/features/super-admin/components/common/ScopeMembersTable';
import {
  assignScopeRole,
  formatTransferLeadApiError,
  removeScopeRole,
  transferScopeLead,
  type OrganizationMember,
  type ScopeMemberCapabilities,
} from '@/services/organizationAdmin';
import type { NonEventRoleKey } from '@/features/organization-structure/permissions';
import { toast } from 'sonner';

interface DivisionsManagementProps {
  activeDivision: Division | null;
  divisions: Division[];
  isLoadingDivisions: boolean;
  divisionError: string;
}

export default function DivisionsManagement({
  activeDivision,
  divisions,
  isLoadingDivisions,
  divisionError,
}: DivisionsManagementProps) {
  const [users, setUsers] = useState<OrganizationMember[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');
  const [memberCapabilities, setMemberCapabilities] = useState<ScopeMemberCapabilities>({
    canManage: false,
    canViewContact: false,
  });
  const [isAddUsersModalOpen, setIsAddUsersModalOpen] = useState(false);
  const [divisionToArchive, setDivisionToArchive] = useState<Division | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isRemoveUsersModalOpen, setIsRemoveUsersModalOpen] = useState(false);
  const [isRemovingUsers, setIsRemovingUsers] = useState(false);
  const [endedAtValue, setEndedAtValue] = useState(() => toVietnamDateTimeLocalValue(new Date()));

  const filteredDivisions = useMemo(() => {
    const queryText = normalizeSearchValue(search);

    if (!queryText) {
      return divisions;
    }

    return divisions.filter((division) =>
      [division.name, division.description].some((value) =>
        normalizeSearchValue(value).includes(queryText),
      ),
    );
  }, [divisions, search]);
  const filteredUsers = useMemo(() => {
    const queryText = normalizeSearchValue(search);

    if (!queryText) {
      return users;
    }

    return users.filter((user) =>
      getSearchableUserValues(user).some((value) =>
        normalizeSearchValue(value).includes(queryText),
      ),
    );
  }, [search, users]);
  const existingUserIds = useMemo(() => users.map((user) => user.uid), [users]);
  const selectedUserIdSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);

  const loadDivisionUsers = useCallback(
    async (divisionId: string, isMounted: () => boolean = () => true) => {
      setIsLoadingUsers(true);
      setUserError('');
      setSelectedUserIds([]);
      setIsAddUsersModalOpen(false);
      setIsRemoveUsersModalOpen(false);

      try {
        const result = await listDivisionMembersWithCapabilities(divisionId);

        if (isMounted()) {
          setUsers(result.members);
          setMemberCapabilities(result.capabilities);
        }
      } catch (error) {
        if (isMounted()) {
          const message = error instanceof Error ? error.message : '';
          setUserError(
            message
              ? `Không thể tải danh sách thành viên của mảng: ${message}`
              : 'Không thể tải danh sách thành viên của mảng.',
          );
          setUsers([]);
          setMemberCapabilities({ canManage: false, canViewContact: false });
        }
      } finally {
        if (isMounted()) {
          setIsLoadingUsers(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!activeDivision) {
      return;
    }

    const divisionId = activeDivision.id;
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      void loadDivisionUsers(divisionId, () => isMounted);
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [activeDivision, loadDivisionUsers]);

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((currentIds) =>
      currentIds.includes(userId)
        ? currentIds.filter((currentId) => currentId !== userId)
        : [...currentIds, userId],
    );
  }

  function toggleVisibleUsersSelection() {
    const visibleUserIds = filteredUsers
      .filter((user) => user.membership.status === 'active')
      .map((user) => user.uid);
    const areAllVisibleUsersSelected =
      visibleUserIds.length > 0 && visibleUserIds.every((userId) => selectedUserIdSet.has(userId));

    setSelectedUserIds((currentIds) => {
      if (areAllVisibleUsersSelected) {
        return currentIds.filter((userId) => !visibleUserIds.includes(userId));
      }

      return Array.from(new Set([...currentIds, ...visibleUserIds]));
    });
  }

  async function handleRemoveSelectedUsers() {
    if (!activeDivision || selectedUserIds.length === 0) {
      return;
    }

    setIsRemovingUsers(true);

    try {
      await removeUsersFromDivision(
        activeDivision.id,
        selectedUserIds,
        fromVietnamDateTimeLocalValue(endedAtValue),
      );
      setSelectedUserIds([]);
      setIsRemoveUsersModalOpen(false);
      toast.success(`Đã kết thúc membership của ${selectedUserIds.length} thành viên trong mảng.`, {
        id: 'division-remove-users-success',
      });
      await loadDivisionUsers(activeDivision.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const errorMessage = message
        ? `Không thể kết thúc membership trong mảng: ${message}`
        : 'Không thể kết thúc membership trong mảng.';
      toast.error(errorMessage, { id: 'division-remove-users-error' });
    } finally {
      setIsRemovingUsers(false);
    }
  }

  async function handleAssignRole(
    userId: string,
    roleKey: NonEventRoleKey,
    startsAt: string,
    endsAt: string | null,
  ) {
    if (!activeDivision) {
      return;
    }

    try {
      await assignScopeRole('division', activeDivision.id, userId, roleKey, startsAt, endsAt);
      toast.success('Đã cập nhật chức vụ trong mảng.', { id: 'division-role-success' });
      await loadDivisionUsers(activeDivision.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(
        message ? `Không thể cập nhật chức vụ: ${message}` : 'Không thể cập nhật chức vụ.',
        {
          id: 'division-role-error',
        },
      );
      throw error;
    }
  }

  async function handleRemoveRole(userId: string, roleKey: NonEventRoleKey, endedAt: string) {
    if (!activeDivision) {
      return;
    }

    try {
      await removeScopeRole('division', activeDivision.id, userId, roleKey, endedAt);
      toast.success('Đã gỡ chức vụ trong mảng.', { id: 'division-role-remove-success' });
      await loadDivisionUsers(activeDivision.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(message ? `Không thể gỡ chức vụ: ${message}` : 'Không thể gỡ chức vụ.', {
        id: 'division-role-remove-error',
      });
      throw error;
    }
  }

  async function handleTransferLead(targetUserId: string) {
    if (!activeDivision) {
      return;
    }

    try {
      await transferScopeLead('division', activeDivision.id, targetUserId);
      toast.success('Đã chuyển giao trưởng mảng.', { id: 'division-transfer-lead-success' });
      await loadDivisionUsers(activeDivision.id);
    } catch (error) {
      const message = formatTransferLeadApiError(error, 'Không thể chuyển giao trưởng mảng.');
      toast.error(`Không thể chuyển giao trưởng mảng: ${message}`, {
        id: 'division-transfer-lead-error',
      });
      throw new Error(message);
    }
  }

  async function handleRevokeMembership(userId: string) {
    if (!activeDivision) {
      return;
    }

    const user = users.find((currentUser) => currentUser.uid === userId);
    const userName = user ? getFullName(user) : 'thành viên này';

    if (!window.confirm(`Thu hồi membership của ${userName} trong mảng này?`)) {
      return;
    }

    try {
      await revokeUsersFromDivision(activeDivision.id, [userId]);
      toast.success('Đã thu hồi membership trong mảng.', {
        id: 'division-revoke-membership-success',
      });
      await loadDivisionUsers(activeDivision.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(
        message
          ? `Không thể thu hồi membership trong mảng: ${message}`
          : 'Không thể thu hồi membership trong mảng.',
        { id: 'division-revoke-membership-error' },
      );
    }
  }

  const isViewingDivisionList = !activeDivision;
  const visibleCount = isViewingDivisionList
    ? `${filteredDivisions.length} mảng`
    : `${filteredUsers.length} thành viên`;

  return (
    <AdminContentPanel
      section={ADMIN_SECTIONS[0]}
      className={activeDivision ? 'flex flex-col' : undefined}
      title={activeDivision?.name ?? 'Quản lý mảng'}
      count={visibleCount}
      actions={
        <DivisionPanelActions
          search={search}
          isMemberView={Boolean(activeDivision)}
          isLoadingUsers={isLoadingUsers}
          canManageMembers={memberCapabilities.canManage}
          isArchived={Boolean(activeDivision?.archivedAt)}
          selectedUserCount={selectedUserIds.length}
          onSearchChange={setSearch}
          onOpenAddUsersModal={() => setIsAddUsersModalOpen(true)}
          onOpenRemoveUsersModal={() => {
            setEndedAtValue(toVietnamDateTimeLocalValue(new Date()));
            setIsRemoveUsersModalOpen(true);
          }}
          onOpenArchiveModal={() => {
            if (activeDivision) {
              setDivisionToArchive(activeDivision);
            }
          }}
        />
      }
    >
      {isViewingDivisionList ? (
        <DivisionsTable
          divisions={filteredDivisions}
          isLoading={isLoadingDivisions}
          error={divisionError}
        />
      ) : (
        <ScopeMembersTable
          scopeType="division"
          users={filteredUsers}
          isLoading={isLoadingUsers}
          error={userError}
          canManage={memberCapabilities.canManage}
          canViewContact={memberCapabilities.canViewContact}
          accent="indigo"
          selectedUserIdSet={selectedUserIdSet}
          onToggleUser={toggleUserSelection}
          onToggleVisibleUsers={toggleVisibleUsersSelection}
          onAssignRole={handleAssignRole}
          onRemoveRole={handleRemoveRole}
          onRevokeMembership={handleRevokeMembership}
          onTransferLead={handleTransferLead}
        />
      )}
      {activeDivision && isAddUsersModalOpen && (
        <AddDivisionUsersModal
          divisionId={activeDivision.id}
          divisionName={activeDivision.name}
          existingUserIds={existingUserIds}
          onClose={() => setIsAddUsersModalOpen(false)}
          onAdded={() => loadDivisionUsers(activeDivision.id)}
        />
      )}
      {activeDivision && isRemoveUsersModalOpen && (
        <ConfirmRemoveUsersModal
          contextName={activeDivision.name}
          contextType="division"
          selectedCount={selectedUserIds.length}
          isRemoving={isRemovingUsers}
          endedAtValue={endedAtValue}
          onCancel={() => {
            if (!isRemovingUsers) {
              setIsRemoveUsersModalOpen(false);
            }
          }}
          onConfirm={handleRemoveSelectedUsers}
          onEndedAtValueChange={setEndedAtValue}
        />
      )}
      {divisionToArchive && (
        <ArchiveScopeModal
          scopeName={divisionToArchive.name}
          scopeLabel="mảng"
          onClose={() => setDivisionToArchive(null)}
          onArchive={(archivedAt) => archiveDivision(divisionToArchive.id, archivedAt)}
          onArchived={(archivedAt) => {
            Object.assign(divisionToArchive, { archivedAt });
            setDivisionToArchive(null);
          }}
        />
      )}
    </AdminContentPanel>
  );
}
