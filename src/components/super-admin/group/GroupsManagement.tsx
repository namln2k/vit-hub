import {
  createGroup,
  deleteGroup,
  listUsersByGroup,
  removeUsersFromGroup,
  updateGroup,
  type Group,
} from '@/api/groups';
import Avatar from '@/components/layout/Avatar';
import type { AppUser } from '@/contexts/auth';
import { Check, Loader2, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AddGroupUsersModal from './AddGroupUsersModal';
import AdminContentPanel from '@/components/super-admin/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/components/super-admin/common/AdminSections';
import ConfirmRemoveUsersModal from '@/components/super-admin/common/ConfirmRemoveUsersModal';
import MembersLoadingOverlay from '@/components/super-admin/common/MembersLoadingOverlay';
import {
  getFullName,
  getSearchableUserValues,
  normalizeSearchValue,
} from '@/components/super-admin/common/UserUtils';
import { getAdminItemPath } from '@/components/super-admin/common/adminRoutes';
import { Link } from 'react-router-dom';

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
          <CreateGroupModal
            onClose={() => setIsCreateModalOpen(false)}
            onCreated={(group) => {
              onGroupCreated(group);
              setIsCreateModalOpen(false);
            }}
          />
        )}
        {groupToEdit && (
          <EditGroupModal
            activeGroup={groupToEdit}
            onClose={() => setGroupToEdit(null)}
            onUpdated={(group) => {
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
        <EditGroupModal
          activeGroup={activeGroup}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(group) => {
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

interface GroupsTableProps {
  groups: Group[];
  isLoading: boolean;
  error: string;
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (group: Group) => void;
}

function GroupsTable({ groups, isLoading, error, onEditGroup, onDeleteGroup }: GroupsTableProps) {
  return (
    <div className="relative min-h-72">
      {isLoading && <MembersLoadingOverlay />}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
                Tên nhóm
              </th>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
                Mô tả
              </th>
              <th className="w-32 px-5 py-3 text-right text-xs font-bold uppercase text-slate-500">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {isLoading ? null : error ? (
              <EmptyTableRow className="text-red-600" colSpan={3}>
                {error}
              </EmptyTableRow>
            ) : groups.length > 0 ? (
              groups.map((group) => (
                <tr key={group.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <Link
                      to={getAdminItemPath('groups', group)}
                      className="font-semibold text-slate-950 transition-colors hover:text-emerald-700"
                    >
                      {group.name}
                    </Link>
                  </td>
                  <td className="max-w-xl px-5 py-4 text-sm font-medium text-slate-600">
                    {group.description || <span className="text-slate-400">Chưa có mô tả</span>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEditGroup(group)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
                        aria-label={`Chỉnh sửa ${group.name}`}
                        title="Chỉnh sửa"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteGroup(group)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                        aria-label={`Xóa ${group.name}`}
                        title="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyTableRow colSpan={3}>Chưa có nhóm.</EmptyTableRow>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface EditGroupModalProps {
  activeGroup: Group;
  onClose: () => void;
  onUpdated: (group: Group) => void;
}

function EditGroupModal({ activeGroup, onClose, onUpdated }: EditGroupModalProps) {
  const [name, setName] = useState(activeGroup.name);
  const [description, setDescription] = useState(activeGroup.description);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(activeGroup.name);
    setDescription(activeGroup.description);
    setError('');
  }, [activeGroup]);

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const hasChanges =
    trimmedName !== activeGroup.name || trimmedDescription !== activeGroup.description.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedName) {
      setError('Tên nhóm không được để trống.');
      return;
    }

    if (!hasChanges) {
      onClose();
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const nextGroup = await updateGroup(activeGroup.id, trimmedName, trimmedDescription);
      onUpdated(nextGroup);
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : '';
      setError(message ? `Không thể cập nhật nhóm: ${message}` : 'Không thể cập nhật nhóm.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-group-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id="edit-group-title" className="text-lg font-bold text-slate-950">
            Chỉnh sửa nhóm
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Tên nhóm</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
              disabled={isSaving}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="Tên nhóm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Mô tả</span>
            <textarea
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setError('');
              }}
              disabled={isSaving}
              className="min-h-24 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="Mô tả ngắn về nhóm"
            />
          </label>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving || !hasChanges}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu
          </button>
        </div>
      </form>
    </div>
  );
}

interface DeleteGroupModalProps {
  group: Group;
  onClose: () => void;
  onDeleted: (groupId: string) => void;
}

function DeleteGroupModal({ group, onClose, onDeleted }: DeleteGroupModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setIsDeleting(true);
    setError('');

    try {
      await deleteGroup(group.id);
      onDeleted(group.id);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : '';
      setError(message ? `Không thể xóa nhóm: ${message}` : 'Không thể xóa nhóm.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-group-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id="delete-group-title" className="text-lg font-bold text-slate-950">
            Xóa nhóm
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm font-medium text-slate-600">
            Bạn có chắc muốn xóa nhóm{' '}
            <span className="font-semibold text-slate-950">{group.name}</span>?
          </p>
          <p className="text-sm font-medium text-slate-500">
            Thành viên sẽ được gỡ khỏi nhóm này trước khi nhóm bị xóa.
          </p>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Xóa nhóm
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: (group: Group) => void;
}

function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Tên nhóm không được để trống.');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      onCreated(await createGroup(name, description));
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : '';
      setError(message ? `Không thể tạo nhóm: ${message}` : 'Không thể tạo nhóm.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-group-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isCreating) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id="create-group-title" className="text-lg font-bold text-slate-950">
            Tạo nhóm mới
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Tên nhóm</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500"
              placeholder="VD: Nhóm 7"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Mô tả</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-24 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500"
              placeholder="Mô tả ngắn về nhóm"
            />
          </label>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isCreating}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Tạo nhóm
          </button>
        </div>
      </div>
    </div>
  );
}

interface GroupMembersTableProps {
  users: AppUser[];
  isLoading: boolean;
  error: string;
  selectedUserIdSet: Set<string>;
  onToggleUser: (userId: string) => void;
  onToggleVisibleUsers: () => void;
}

function GroupMembersTable({
  users,
  isLoading,
  error,
  selectedUserIdSet,
  onToggleUser,
  onToggleVisibleUsers,
}: GroupMembersTableProps) {
  const areAllVisibleUsersSelected =
    users.length > 0 && users.every((user) => selectedUserIdSet.has(user.uid));

  return (
    <div className="relative min-h-72 flex-1">
      {isLoading && <MembersLoadingOverlay />}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-12 px-5 py-3">
                <input
                  type="checkbox"
                  checked={areAllVisibleUsersSelected}
                  onChange={onToggleVisibleUsers}
                  disabled={isLoading || users.length === 0}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Chọn tất cả thành viên đang hiển thị"
                />
              </th>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
                Thành viên
              </th>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
                Username
              </th>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
                Email
              </th>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
                Vai trò
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {isLoading ? null : error ? (
              <EmptyTableRow className="text-red-600" colSpan={5}>
                {error}
              </EmptyTableRow>
            ) : users.length > 0 ? (
              users.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUserIdSet.has(user.uid)}
                      onChange={() => onToggleUser(user.uid)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      aria-label={`Chọn ${getFullName(user)}`}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={user.avatarUrl} size="sm" />
                      <span className="font-semibold text-slate-950 whitespace-nowrap">
                        {getFullName(user)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-600">
                    @{user.username}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-600">{user.email}</td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-600">{user.role}</td>
                </tr>
              ))
            ) : (
              <EmptyTableRow colSpan={5}>Chưa có thành viên trong nhóm này.</EmptyTableRow>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface EmptyTableRowProps {
  children: string;
  className?: string;
  colSpan?: number;
}

function EmptyTableRow({
  children,
  className = 'text-slate-500',
  colSpan = 4,
}: EmptyTableRowProps) {
  return (
    <tr>
      <td className={`px-5 py-10 text-center text-sm font-medium ${className}`} colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}
