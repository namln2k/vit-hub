import { listUsersByDivision, type Division } from '@/api/divisions';
import Avatar from '@/components/layout/Avatar';
import type { AppUser } from '@/contexts/auth';
import { Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AddDivisionUsersModal from './AddDivisionUsersModal';
import AdminContentPanel from '@/components/super-admin/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/components/super-admin/common/AdminSections';
import { getFullName, normalizeSearchValue } from '@/components/super-admin/common/UserUtils';

interface DivisionsManagementProps {
  activeDivision: Division | null;
}

export default function DivisionsManagement({ activeDivision }: DivisionsManagementProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');
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
      return;
    }

    const divisionId = activeDivision.id;
    let isMounted = true;

    void loadDivisionUsers(divisionId, () => isMounted);

    return () => {
      isMounted = false;
    };
  }, [activeDivision, loadDivisionUsers]);

  return (
    <AdminContentPanel
      section={ADMIN_SECTIONS[0]}
      title={activeDivision?.name ?? 'Quản lý mảng'}
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
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 sm:w-64"
            />
          </label>
          <button
            type="button"
            onClick={() => setIsAddUsersModalOpen(true)}
            disabled={!activeDivision}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Plus className="h-4 w-4" />
            Thêm
          </button>
        </>
      }
    >
      <DivisionMembersTable users={filteredUsers} isLoading={isLoadingUsers} error={userError} />
      {activeDivision && isAddUsersModalOpen && (
        <AddDivisionUsersModal
          divisionId={activeDivision.id}
          divisionName={activeDivision.name}
          existingUserIds={existingUserIds}
          onClose={() => setIsAddUsersModalOpen(false)}
          onAdded={() => loadDivisionUsers(activeDivision.id)}
        />
      )}
    </AdminContentPanel>
  );
}

interface DivisionMembersTableProps {
  users: AppUser[];
  isLoading: boolean;
  error: string;
}

function DivisionMembersTable({ users, isLoading, error }: DivisionMembersTableProps) {
  return (
    <div className="overflow-x-auto">
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
          {isLoading ? (
            <EmptyTableRow>Đang tải thành viên...</EmptyTableRow>
          ) : error ? (
            <EmptyTableRow className="text-red-600">{error}</EmptyTableRow>
          ) : users.length > 0 ? (
            users.map((user) => (
              <tr key={user.uid} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={user.avatarUrl} size="sm" />
                    <span className="font-semibold text-slate-950">{getFullName(user)}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">@{user.username}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">{user.email}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">{user.role}</td>
              </tr>
            ))
          ) : (
            <EmptyTableRow>Chưa có thành viên trong mảng này.</EmptyTableRow>
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
