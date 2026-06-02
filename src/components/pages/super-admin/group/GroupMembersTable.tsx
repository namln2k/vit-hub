import Avatar from '@/components/shared/layout/Avatar';
import MembersLoadingOverlay from '@/components/pages/super-admin/common/MembersLoadingOverlay';
import { getFullName } from '@/components/pages/super-admin/common/UserUtils';
import type { AppUser } from '@/contexts/auth';

interface GroupMembersTableProps {
  users: AppUser[];
  isLoading: boolean;
  error: string;
  selectedUserIdSet: Set<string>;
  onToggleUser: (userId: string) => void;
  onToggleVisibleUsers: () => void;
}

export default function GroupMembersTable({
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
              <tr>
                <td
                  className="px-5 py-10 text-center text-sm font-medium text-red-600"
                  colSpan={5}
                >
                  {error}
                </td>
              </tr>
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
              <tr>
                <td
                  className="px-5 py-10 text-center text-sm font-medium text-slate-500"
                  colSpan={5}
                >
                  Chưa có thành viên trong nhóm này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
