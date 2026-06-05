import { listUsersByDivision, removeUsersFromDivision, type Division } from '@/services/divisions';
import type { AppUser } from '@/contexts/auth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminContentPanel from '@/features/super-admin/components/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/features/super-admin/constants/adminSections';
import ConfirmRemoveUsersModal from '@/features/super-admin/components/common/ConfirmRemoveUsersModal';
import {
  getSearchableUserValues,
  normalizeSearchValue,
} from '@/features/super-admin/lib/userUtils';
import AddDivisionUsersModal from './AddDivisionUsersModal';
import DivisionMembersTable from './DivisionMembersTable';
import DivisionPanelActions from './DivisionPanelActions';
import DivisionsTable from './DivisionsTable';
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
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');
  const [isAddUsersModalOpen, setIsAddUsersModalOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isRemoveUsersModalOpen, setIsRemoveUsersModalOpen] = useState(false);
  const [isRemovingUsers, setIsRemovingUsers] = useState(false);

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

      try {
        const nextUsers = await listUsersByDivision(divisionId);

        if (isMounted()) {
          setUsers(nextUsers);
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
      setUsers([]);
      setIsAddUsersModalOpen(false);
      setSelectedUserIds([]);
      setIsRemoveUsersModalOpen(false);
      return;
    }

    const divisionId = activeDivision.id;
    let isMounted = true;

    void loadDivisionUsers(divisionId, () => isMounted);

    return () => {
      isMounted = false;
    };
  }, [activeDivision, loadDivisionUsers]);

  useEffect(() => {
    const userIdSet = new Set(users.map((user) => user.uid));
    setSelectedUserIds((currentIds) => currentIds.filter((userId) => userIdSet.has(userId)));
  }, [users]);

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((currentIds) =>
      currentIds.includes(userId)
        ? currentIds.filter((currentId) => currentId !== userId)
        : [...currentIds, userId],
    );
  }

  function toggleVisibleUsersSelection() {
    const visibleUserIds = filteredUsers.map((user) => user.uid);
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
      await removeUsersFromDivision(activeDivision.id, selectedUserIds);
      setUsers((currentUsers) =>
        currentUsers.filter((user) => !selectedUserIds.includes(user.uid)),
      );
      setSelectedUserIds([]);
      setIsRemoveUsersModalOpen(false);
      toast.success(`Đã xóa ${selectedUserIds.length} thành viên khỏi mảng.`, {
        id: 'division-remove-users-success',
      });
      void loadDivisionUsers(activeDivision.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const errorMessage = message
        ? `Không thể xóa thành viên khỏi mảng: ${message}`
        : 'Không thể xóa thành viên khỏi mảng.';
      toast.error(errorMessage, { id: 'division-remove-users-error' });
    } finally {
      setIsRemovingUsers(false);
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
          selectedUserCount={selectedUserIds.length}
          onSearchChange={setSearch}
          onOpenAddUsersModal={() => setIsAddUsersModalOpen(true)}
          onOpenRemoveUsersModal={() => setIsRemoveUsersModalOpen(true)}
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
        <DivisionMembersTable
          users={filteredUsers}
          isLoading={isLoadingUsers}
          error={userError}
          selectedUserIdSet={selectedUserIdSet}
          onToggleUser={toggleUserSelection}
          onToggleVisibleUsers={toggleVisibleUsersSelection}
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
          onCancel={() => {
            if (!isRemovingUsers) {
              setIsRemoveUsersModalOpen(false);
            }
          }}
          onConfirm={handleRemoveSelectedUsers}
        />
      )}
    </AdminContentPanel>
  );
}
