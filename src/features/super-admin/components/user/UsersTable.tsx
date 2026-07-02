import Avatar from '@/shared/layout/Avatar';
import { getPublicUserProfilePath } from '@/constants/routes';
import { getFullName } from '@/features/super-admin/lib/userUtils';
import { USER_ROLE_LABELS } from '@/constants/userRoles';
import type { AppUser } from '@/contexts/auth';
import type { UserStatus } from '@/features/organization-structure/permissions';
import { getGenderLabel } from '@/features/super-admin/lib/userDisplayUtils';
import { Power, PowerOff } from 'lucide-react';
import Link from 'next/link';

interface UsersTableProps {
  users: AppUser[];
  isLoading: boolean;
  error: string;
  onUpdateUserStatus: (user: AppUser, status: UserStatus) => void;
}

export default function UsersTable({
  users,
  isLoading,
  error,
  onUpdateUserStatus,
}: UsersTableProps) {
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
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">SĐT</th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Trường
            </th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Năm vào Đội
            </th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">Khóa</th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Giới tính
            </th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Vai trò
            </th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Trạng thái
            </th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {isLoading ? (
            <tr>
              <td
                className="px-5 py-10 text-center text-sm font-medium text-slate-500"
                colSpan={11}
              >
                Đang tải nhân sự...
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td className="px-5 py-10 text-center text-sm font-medium text-red-600" colSpan={11}>
                {error}
              </td>
            </tr>
          ) : users.length > 0 ? (
            users.map((user) => (
              <tr key={user.uid} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <UserIdentity user={user} />
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  <UsernameText user={user} />
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">{user.email}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">{user.phoneNumber}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {user.schoolName || '-'}
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {user.enterYear || '-'}
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {user.cohort || '-'}
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {getGenderLabel(user.gender)}
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {USER_ROLE_LABELS[user.role]}
                </td>
                <td className="px-5 py-4">
                  <UserStatusBadge status={user.status ?? 'active'} />
                </td>
                <td className="px-5 py-4">
                  {user.status === 'disabled' ? (
                    <button
                      type="button"
                      onClick={() => onUpdateUserStatus(user, 'active')}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                    >
                      <Power className="h-4 w-4" />
                      Enable
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUpdateUserStatus(user, 'disabled')}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <PowerOff className="h-4 w-4" />
                      Disable
                    </button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                className="px-5 py-10 text-center text-sm font-medium text-slate-500"
                colSpan={11}
              >
                Chưa có nhân sự.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function UserIdentity({ user }: { user: AppUser }) {
  const content = (
    <>
      <Avatar src={user.avatarUrl} size="sm" />
      <span className="font-semibold text-slate-950 whitespace-nowrap">{getFullName(user)}</span>
    </>
  );

  if (user.status !== 'active') {
    return <div className="flex items-center gap-3">{content}</div>;
  }

  return (
    <Link href={getPublicUserProfilePath(user.username)} className="flex items-center gap-3">
      {content}
    </Link>
  );
}

function UsernameText({ user }: { user: AppUser }) {
  if (user.status !== 'active') {
    return <>@{user.username}</>;
  }

  return (
    <Link
      href={getPublicUserProfilePath(user.username)}
      className="hover:text-indigo-700 hover:underline"
    >
      @{user.username}
    </Link>
  );
}

function UserStatusBadge({ status }: { status: UserStatus }) {
  const className =
    status === 'active'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700';

  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${className}`}>
      {status === 'active' ? 'Active' : 'Disabled'}
    </span>
  );
}
