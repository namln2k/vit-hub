import { createGroup, listUsersByGroup, type Group } from '@/api/groups';
import Avatar from '@/components/layout/Avatar';
import type { AppUser } from '@/contexts/auth';
import { Check, Loader2, Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AddGroupUsersModal from './AddGroupUsersModal';
import AdminContentPanel from '@/components/super-admin/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/components/super-admin/common/AdminSections';
import MembersLoadingOverlay from '@/components/super-admin/common/MembersLoadingOverlay';
import { getFullName, normalizeSearchValue } from '@/components/super-admin/common/UserUtils';

interface GroupsManagementProps {
  activeGroup: Group | null;
  onGroupCreated: (group: Group) => void;
}

export default function GroupsManagement({ activeGroup, onGroupCreated }: GroupsManagementProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddUsersModalOpen, setIsAddUsersModalOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    const queryText = normalizeSearchValue(search);

    if (!queryText) {
      return users;
    }

    return users.filter((user) =>
      [getFullName(user), user.username, user.email].some((value) =>
        normalizeSearchValue(value).includes(queryText),
      ),
    );
  }, [search, users]);
  const existingUserIds = useMemo(() => users.map((user) => user.uid), [users]);

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
      setIsAddUsersModalOpen(false);
      return;
    }

    const groupId = activeGroup.id;
    let isMounted = true;

    void loadGroupUsers(groupId, () => isMounted);

    return () => {
      isMounted = false;
    };
  }, [activeGroup, loadGroupUsers]);

  return (
    <AdminContentPanel
      section={ADMIN_SECTIONS[1]}
      title={activeGroup?.name ?? 'Quản lý nhóm'}
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
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Tạo nhóm
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
      <GroupMembersTable users={filteredUsers} isLoading={isLoadingUsers} error={userError} />
      {isCreateModalOpen && (
        <CreateGroupModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={(group) => {
            onGroupCreated(group);
            setIsCreateModalOpen(false);
          }}
        />
      )}
      {activeGroup && isAddUsersModalOpen && (
        <AddGroupUsersModal
          groupId={activeGroup.id}
          groupName={activeGroup.name}
          existingUserIds={existingUserIds}
          onClose={() => setIsAddUsersModalOpen(false)}
          onAdded={() => loadGroupUsers(activeGroup.id)}
        />
      )}
    </AdminContentPanel>
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
}

function GroupMembersTable({ users, isLoading, error }: GroupMembersTableProps) {
  return (
    <div className="relative min-h-72 overflow-x-auto">
      {isLoading && <MembersLoadingOverlay />}
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
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
            <EmptyTableRow className="text-red-600">{error}</EmptyTableRow>
          ) : users.length > 0 ? (
            users.map((user) => (
              <tr key={user.uid} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={user.avatarUrl} size="sm" />
                    <span className="font-semibold text-slate-950 whitespace-nowrap">{getFullName(user)}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">@{user.username}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">{user.email}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">{user.role}</td>
              </tr>
            ))
          ) : (
            <EmptyTableRow>Chưa có thành viên trong nhóm này.</EmptyTableRow>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface EmptyTableRowProps {
  children: string;
  className?: string;
}

function EmptyTableRow({ children, className = 'text-slate-500' }: EmptyTableRowProps) {
  return (
    <tr>
      <td className={`px-5 py-10 text-center text-sm font-medium ${className}`} colSpan={4}>
        {children}
      </td>
    </tr>
  );
}
