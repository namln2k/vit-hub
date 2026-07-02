import type { Group } from '@/services/groups';
import MembersLoadingOverlay from '@/features/super-admin/components/common/MembersLoadingOverlay';
import { getAdminItemPath } from '@/features/super-admin/lib/adminRoutes';
import { Pencil } from 'lucide-react';
import Link from 'next/link';

interface GroupsTableProps {
  groups: Group[];
  isLoading: boolean;
  error: string;
  onEditGroup: (group: Group) => void;
}

export default function GroupsTable({ groups, isLoading, error, onEditGroup }: GroupsTableProps) {
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
              <th className="px-3 py-3 text-center text-xs font-bold uppercase text-slate-500">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {isLoading ? null : error ? (
              <tr>
                <td className="px-5 py-10 text-center text-sm font-medium text-red-600" colSpan={3}>
                  {error}
                </td>
              </tr>
            ) : groups.length > 0 ? (
              groups.map((group) => (
                <tr
                  key={group.id}
                  className={`hover:bg-slate-50 ${group.archivedAt ? 'bg-slate-50/70 text-slate-500' : ''}`}
                >
                  <td className="px-5 py-4">
                    <Link
                      href={getAdminItemPath('groups', group)}
                      className="font-semibold text-slate-950 transition-colors hover:text-emerald-700"
                    >
                      {group.name}
                    </Link>
                    {group.archivedAt ? (
                      <span className="ml-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        Đã lưu trữ
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-xl px-5 py-4 text-sm font-medium text-slate-600">
                    {group.description || <span className="text-slate-400">Chưa có mô tả</span>}
                  </td>
                  <td className="px-3 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => onEditGroup(group)}
                      disabled={Boolean(group.archivedAt)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
                      aria-label={`Chỉnh sửa ${group.name}`}
                      title="Chỉnh sửa"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-5 py-10 text-center text-sm font-medium text-slate-500"
                  colSpan={3}
                >
                  Chưa có nhóm.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
