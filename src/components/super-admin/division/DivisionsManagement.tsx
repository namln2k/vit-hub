import { listUsersByDivision, removeUsersFromDivision, type Division } from '@/api/divisions';
import Avatar from '@/components/layout/Avatar';
import type { AppUser } from '@/contexts/auth';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminContentPanel from '@/components/super-admin/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/components/super-admin/common/AdminSections';
import ConfirmRemoveUsersModal from '@/components/super-admin/common/ConfirmRemoveUsersModal';
import MembersLoadingOverlay from '@/components/super-admin/common/MembersLoadingOverlay';
import {
  getFullName,
  getSearchableUserValues,
  normalizeSearchValue,
} from '@/components/super-admin/common/UserUtils';
import AddDivisionUsersModal from './AddDivisionUsersModal';

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
  const [removeUsersError, setRemoveUsersError] = useState('');

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
      getSearchableUserValues(user).some((value) => normalizeSearchValue(value).includes(queryText)),
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
    setRemoveUsersError('');

    try {
      await removeUsersFromDivision(activeDivision.id, selectedUserIds);
      setUsers((currentUsers) =>
        currentUsers.filter((user) => !selectedUserIds.includes(user.uid)),
      );
      setSelectedUserIds([]);
      setIsRemoveUsersModalOpen(false);
      void loadDivisionUsers(activeDivision.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setRemoveUsersError(
        message
          ? `Không thể xóa thành viên khỏi mảng: ${message}`
          : 'Không thể xóa thành viên khỏi mảng.',
      );
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
      title={activeDivision?.name ?? 'Quản lý mảng'}
      count={visibleCount}
      actions={
        <>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm kiếm"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 sm:w-64"
            />
          </label>
          {activeDivision && (
            <>
              <button
                type="button"
                onClick={() => {
                  setRemoveUsersError('');
                  setIsRemoveUsersModalOpen(true);
                }}
                disabled={selectedUserIds.length === 0 || isLoadingUsers}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"
              >
                <Trash2 className="h-4 w-4" />
                Xóa{selectedUserIds.length > 0 ? ` ${selectedUserIds.length}` : ''}
              </button>
              <button
                type="button"
                onClick={() => setIsAddUsersModalOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Thêm
              </button>
            </>
          )}
        </>
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

interface DivisionsTableProps {
  divisions: Division[];
  isLoading: boolean;
  error: string;
}

function DivisionsTable({ divisions, isLoading, error }: DivisionsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Tên mảng
            </th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Mô tả
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {isLoading ? (
            <EmptyTableRow colSpan={2}>Đang tải mảng...</EmptyTableRow>
          ) : error ? (
            <EmptyTableRow className="text-red-600" colSpan={2}>
              {error}
            </EmptyTableRow>
          ) : divisions.length > 0 ? (
            divisions.map((division) => (
              <tr key={division.id} className="hover:bg-slate-50">
                <td className="px-5 py-4 text-sm font-semibold text-slate-950">{division.name}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {division.description || 'Chưa có mô tả'}
                </td>
              </tr>
            ))
          ) : (
            <EmptyTableRow colSpan={2}>Chưa có mảng.</EmptyTableRow>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface DivisionMembersTableProps {
  users: AppUser[];
  isLoading: boolean;
  error: string;
  selectedUserIdSet: Set<string>;
  onToggleUser: (userId: string) => void;
  onToggleVisibleUsers: () => void;
}

function DivisionMembersTable({
  users,
  isLoading,
  error,
  selectedUserIdSet,
  onToggleUser,
  onToggleVisibleUsers,
}: DivisionMembersTableProps) {
  const areAllVisibleUsersSelected =
    users.length > 0 && users.every((user) => selectedUserIdSet.has(user.uid));

  return (
    <div className="relative min-h-72 overflow-x-auto">
      {isLoading && <MembersLoadingOverlay />}
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="w-12 px-5 py-3">
              <input
                type="checkbox"
                checked={areAllVisibleUsersSelected}
                onChange={onToggleVisibleUsers}
                disabled={isLoading || users.length === 0}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
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
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
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
                <td className="px-5 py-4 text-sm font-medium text-slate-600">@{user.username}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">{user.email}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">{user.role}</td>
              </tr>
            ))
          ) : (
            <EmptyTableRow colSpan={5}>Chưa có thành viên trong mảng này.</EmptyTableRow>
          )}
        </tbody>
      </table>
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
