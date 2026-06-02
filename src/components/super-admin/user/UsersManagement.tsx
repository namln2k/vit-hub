import { queryUsers } from '@/api/users';
import Avatar from '@/components/layout/Avatar';
import AdminContentPanel from '@/components/super-admin/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/components/super-admin/common/AdminSections';
import {
  getFullName,
  getSearchableUserValues,
  normalizeSearchValue,
} from '@/components/super-admin/common/UserUtils';
import { USER_ROLE_LABELS } from '@/constants/userRoles';
import type { AppUser } from '@/contexts/auth';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const USERS_SECTION = ADMIN_SECTIONS.find((section) => section.id === 'users') ?? ADMIN_SECTIONS[0];

export default function UsersManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userError, setUserError] = useState('');

  const filteredUsers = useMemo(() => {
    const queryText = normalizeSearchValue(search);

    if (!queryText) {
      return users;
    }

    return users.filter((user) =>
      [...getSearchableUserValues(user), USER_ROLE_LABELS[user.role]].some((value) =>
        normalizeSearchValue(value).includes(queryText),
      ),
    );
  }, [search, users]);

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      setIsLoadingUsers(true);
      setUserError('');

      try {
        const nextUsers = await queryUsers({ fetchAll: true });

        if (isMounted) {
          setUsers(nextUsers);
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : '';
          setUserError(
            message
              ? `Không thể tải danh sách nhân sự: ${message}`
              : 'Không thể tải danh sách nhân sự.',
          );
          setUsers([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingUsers(false);
        }
      }
    }

    void loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AdminContentPanel
      section={USERS_SECTION}
      title="Quản lý nhân sự"
      count={`${filteredUsers.length} nhân sự`}
      actions={
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm kiếm"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 sm:w-64"
          />
        </label>
      }
    >
      <UsersTable users={filteredUsers} isLoading={isLoadingUsers} error={userError} />
    </AdminContentPanel>
  );
}

interface UsersTableProps {
  users: AppUser[];
  isLoading: boolean;
  error: string;
}

function UsersTable({ users, isLoading, error }: UsersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Nhân sự
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
            <EmptyTableRow>Đang tải nhân sự...</EmptyTableRow>
          ) : error ? (
            <EmptyTableRow className="text-red-600">{error}</EmptyTableRow>
          ) : users.length > 0 ? (
            users.map((user) => (
              <tr key={user.uid} className="hover:bg-slate-50">
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
                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {USER_ROLE_LABELS[user.role]}
                </td>
              </tr>
            ))
          ) : (
            <EmptyTableRow>Chưa có nhân sự.</EmptyTableRow>
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
