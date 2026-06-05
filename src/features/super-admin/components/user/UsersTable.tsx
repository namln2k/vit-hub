import Avatar from '@/shared/layout/Avatar';
import { getFullName } from '@/features/super-admin/lib/userUtils';
import { USER_ROLE_LABELS } from '@/constants/userRoles';
import type { AppUser } from '@/contexts/auth';
import { getGenderLabel } from '@/features/super-admin/lib/userDisplayUtils';

interface UsersTableProps {
  users: AppUser[];
  isLoading: boolean;
  error: string;
}

export default function UsersTable({ users, isLoading, error }: UsersTableProps) {
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
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {isLoading ? (
            <tr>
              <td
                className="px-5 py-10 text-center text-sm font-medium text-slate-500"
                colSpan={9}
              >
                Đang tải nhân sự...
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td className="px-5 py-10 text-center text-sm font-medium text-red-600" colSpan={9}>
                {error}
              </td>
            </tr>
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
              </tr>
            ))
          ) : (
            <tr>
              <td
                className="px-5 py-10 text-center text-sm font-medium text-slate-500"
                colSpan={9}
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
