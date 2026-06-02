import {
  listUsersByGroup,
  removeUsersFromGroup,
  type Group,
} from '@/api/groups';
import type { AppUser } from '@/contexts/auth';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AddGroupUsersModal from './AddGroupUsersModal';
import AdminContentPanel from '@/components/pages/super-admin/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/components/pages/super-admin/common/AdminSections';
import ConfirmRemoveUsersModal from '@/components/pages/super-admin/common/ConfirmRemoveUsersModal';
import {
  getSearchableUserValues,
  normalizeSearchValue,
} from '@/components/pages/super-admin/common/UserUtils';
import DeleteGroupModal from './DeleteGroupModal';
import GroupFormModal from './GroupFormModal';
import GroupMembersTable from './GroupMembersTable';
import GroupsTable from './GroupsTable';

interface GroupsManagementProps {
  activeGroup: Group | null;
  groups: Group[];
  isLoadingGroups: boolean;
  groupError: string;
  onGroupCreated: (group: Group) => void;
  onGroupUpdated: (group: Group) => void;
  onGroupDeleted: (groupId: string) => void;
}

export default function GroupsManagement({
  activeGroup,
  groups,
  isLoadingGroups,
  groupError,
  onGroupCreated,
  onGroupUpdated,
  onGroupDeleted,
}: GroupsManagementProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [isAddUsersModalOpen, setIsAddUsersModalOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isRemoveUsersModalOpen, setIsRemoveUsersModalOpen] = useState(false);
  const [isRemovingUsers, setIsRemovingUsers] = useState(false);
  const [removeUsersError, setRemoveUsersError] = useState('');

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

  const loadGroupUsers = useCallback(
    async (groupId: string, isMounted: () => boolean = () => true) => {
      setIsLoadingUsers(true);
      setUserError('');

      try {
        const nextUsers = await listUsersByGroup(groupId);

        if (isMounted()) {
          setUsers(nextUsers);
        }
      } catch (error) {
        if (isMounted()) {
          const message = error instanceof Error ? error.message : '';
          setUserError(
            message
              ? `Không thể tải danh sách thành viên của nhóm: ${message}`
              : 'Không thể tải danh sách thành viên của nhóm.',
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
    if (!activeGroup) {
      setUsers([]);
      setIsEditModalOpen(false);
      setIsAddUsersModalOpen(false);
      setSelectedUserIds([]);
      setIsRemoveUsersModalOpen(false);
      return;
    }

    const groupId = activeGroup.id;
    let isMounted = true;

    void loadGroupUsers(groupId, () => isMounted);

    return () => {
      isMounted = false;
    };
  }, [activeGroup, loadGroupUsers]);

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
    if (!activeGroup || selectedUserIds.length === 0) {
      return;
    }

    setIsRemovingUsers(true);
    setRemoveUsersError('');

    try {
      await removeUsersFromGroup(activeGroup.id, selectedUserIds);
      setUsers((currentUsers) =>
        currentUsers.filter((user) => !selectedUserIds.includes(user.uid)),
      );
      setSelectedUserIds([]);
      setIsRemoveUsersModalOpen(false);
      void loadGroupUsers(activeGroup.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setRemoveUsersError(
        message
          ? `Không thể xóa thành viên khỏi nhóm: ${message}`
          : 'Không thể xóa thành viên khỏi nhóm.',
      );
    } finally {
      setIsRemovingUsers(false);
    }
  }

  if (!activeGroup) {
    return (
      <AdminContentPanel
        section={ADMIN_SECTIONS[1]}
        title="Quản lý nhóm"
        count={`${groups.length} nhóm`}
        actions={
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Tạo nhóm
          </button>
        }
      >
        <GroupsTable
          groups={groups}
          isLoading={isLoadingGroups}
          error={groupError}
          onEditGroup={setGroupToEdit}
          onDeleteGroup={setGroupToDelete}
        />
        {isCreateModalOpen && (
          <GroupFormModal
            onClose={() => setIsCreateModalOpen(false)}
            onSaved={(group) => {
              onGroupCreated(group);
              setIsCreateModalOpen(false);
            }}
          />
        )}
        {groupToEdit && (
          <GroupFormModal
            group={groupToEdit}
            onClose={() => setGroupToEdit(null)}
            onSaved={(group) => {
              onGroupUpdated(group);
              setGroupToEdit(null);
            }}
          />
        )}
        {groupToDelete && (
          <DeleteGroupModal
            group={groupToDelete}
            onClose={() => setGroupToDelete(null)}
            onDeleted={(groupId) => {
              onGroupDeleted(groupId);
              setGroupToDelete(null);
            }}
          />
        )}
      </AdminContentPanel>
    );
  }

  return (
    <AdminContentPanel
      section={ADMIN_SECTIONS[1]}
      className="flex flex-col"
      title={
        <>
          <span className="truncate">{activeGroup.name}</span>
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
            aria-label="Chỉnh sửa nhóm"
            title="Chỉnh sửa nhóm"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </>
      }
      count={`${filteredUsers.length} thành viên`}
      actions={
        <>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm kiếm"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 sm:w-64"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setRemoveUsersError('');
              setIsRemoveUsersModalOpen(true);
            }}
            disabled={!activeGroup || selectedUserIds.length === 0 || isLoadingUsers}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"
          >
            <Trash2 className="h-4 w-4" />
            Xóa{selectedUserIds.length > 0 ? ` ${selectedUserIds.length}` : ''}
          </button>
          <button
            type="button"
            onClick={() => setIsAddUsersModalOpen(true)}
            disabled={!activeGroup}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Plus className="h-4 w-4" />
            Thêm
          </button>
        </>
      }
    >
      <GroupMembersTable
        users={filteredUsers}
        isLoading={isLoadingUsers}
        error={userError}
        selectedUserIdSet={selectedUserIdSet}
        onToggleUser={toggleUserSelection}
        onToggleVisibleUsers={toggleVisibleUsersSelection}
      />
      {isEditModalOpen && (
        <GroupFormModal
          group={activeGroup}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={(group) => {
            onGroupUpdated(group);
            setIsEditModalOpen(false);
          }}
        />
      )}
      {isAddUsersModalOpen && (
        <AddGroupUsersModal
          groupId={activeGroup.id}
          groupName={activeGroup.name}
          existingUserIds={existingUserIds}
          onClose={() => setIsAddUsersModalOpen(false)}
          onAdded={() => loadGroupUsers(activeGroup.id)}
        />
      )}
      {isRemoveUsersModalOpen && (
        <ConfirmRemoveUsersModal
          contextName={activeGroup.name}
          contextType="group"
          selectedCount={selectedUserIds.length}
          isRemoving={isRemovingUsers}
          error={removeUsersError}
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
