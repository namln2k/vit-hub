import {
  listGroupMembers,
  removeUsersFromGroup,
  revokeUsersFromGroup,
  type Group,
} from '@/services/groups';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AddGroupUsersModal from './AddGroupUsersModal';
import AdminContentPanel from '@/features/super-admin/components/common/AdminContentPanel';
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
import DeleteGroupModal from './DeleteGroupModal';
import GroupFormModal from './GroupFormModal';
import GroupsTable from './GroupsTable';
import ScopeMembersTable from '@/features/super-admin/components/common/ScopeMembersTable';
import {
  assignScopeRole,
  removeScopeRole,
  type OrganizationMember,
} from '@/services/organizationAdmin';
import type { NonEventRoleKey } from '@/features/organization-structure/permissions';
import { toast } from 'sonner';

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
  const [users, setUsers] = useState<OrganizationMember[]>([]);
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
  const [endedAtValue, setEndedAtValue] = useState(() => toVietnamDateTimeLocalValue(new Date()));

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
      setSelectedUserIds([]);
      setIsEditModalOpen(false);
      setIsAddUsersModalOpen(false);
      setIsRemoveUsersModalOpen(false);

      try {
        const nextUsers = await listGroupMembers(groupId);

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
      return;
    }

    const groupId = activeGroup.id;
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      void loadGroupUsers(groupId, () => isMounted);
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [activeGroup, loadGroupUsers]);

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
    if (!activeGroup || selectedUserIds.length === 0) {
      return;
    }

    setIsRemovingUsers(true);

    try {
      await removeUsersFromGroup(
        activeGroup.id,
        selectedUserIds,
        fromVietnamDateTimeLocalValue(endedAtValue),
      );
      setSelectedUserIds([]);
      setIsRemoveUsersModalOpen(false);
      toast.success(`Đã kết thúc membership của ${selectedUserIds.length} thành viên trong nhóm.`, {
        id: 'group-remove-users-success',
      });
      await loadGroupUsers(activeGroup.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const errorMessage = message
        ? `Không thể kết thúc membership trong nhóm: ${message}`
        : 'Không thể kết thúc membership trong nhóm.';
      toast.error(errorMessage, { id: 'group-remove-users-error' });
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
    if (!activeGroup) {
      return;
    }

    try {
      await assignScopeRole('group', activeGroup.id, userId, roleKey, startsAt, endsAt);
      toast.success('Đã cập nhật chức vụ trong nhóm.', { id: 'group-role-success' });
      await loadGroupUsers(activeGroup.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(
        message ? `Không thể cập nhật chức vụ: ${message}` : 'Không thể cập nhật chức vụ.',
        {
          id: 'group-role-error',
        },
      );
      throw error;
    }
  }

  async function handleRemoveRole(userId: string, roleKey: NonEventRoleKey, endedAt: string) {
    if (!activeGroup) {
      return;
    }

    try {
      await removeScopeRole('group', activeGroup.id, userId, roleKey, endedAt);
      toast.success('Đã gỡ chức vụ trong nhóm.', { id: 'group-role-remove-success' });
      await loadGroupUsers(activeGroup.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(message ? `Không thể gỡ chức vụ: ${message}` : 'Không thể gỡ chức vụ.', {
        id: 'group-role-remove-error',
      });
      throw error;
    }
  }

  async function handleRevokeMembership(userId: string) {
    if (!activeGroup) {
      return;
    }

    const user = users.find((currentUser) => currentUser.uid === userId);
    const userName = user ? getFullName(user) : 'thành viên này';

    if (!window.confirm(`Thu hồi membership của ${userName} trong nhóm này?`)) {
      return;
    }

    try {
      await revokeUsersFromGroup(activeGroup.id, [userId]);
      toast.success('Đã thu hồi membership trong nhóm.', {
        id: 'group-revoke-membership-success',
      });
      await loadGroupUsers(activeGroup.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(
        message
          ? `Không thể thu hồi membership trong nhóm: ${message}`
          : 'Không thể thu hồi membership trong nhóm.',
        { id: 'group-revoke-membership-error' },
      );
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
              setEndedAtValue(toVietnamDateTimeLocalValue(new Date()));
              setIsRemoveUsersModalOpen(true);
            }}
            disabled={!activeGroup || selectedUserIds.length === 0 || isLoadingUsers}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"
          >
            <Trash2 className="h-4 w-4" />
            Kết thúc{selectedUserIds.length > 0 ? ` ${selectedUserIds.length}` : ''}
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
      <ScopeMembersTable
        scopeType="group"
        users={filteredUsers}
        isLoading={isLoadingUsers}
        error={userError}
        accent="emerald"
        selectedUserIdSet={selectedUserIdSet}
        onToggleUser={toggleUserSelection}
        onToggleVisibleUsers={toggleVisibleUsersSelection}
        onAssignRole={handleAssignRole}
        onRemoveRole={handleRemoveRole}
        onRevokeMembership={handleRevokeMembership}
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
    </AdminContentPanel>
  );
}
