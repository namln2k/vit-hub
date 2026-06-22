import type { Club } from '@/services/clubs';
import { getAdminItemPath } from '@/features/super-admin/lib/adminRoutes';
import Sharingan from '@/shared/loading/Sharingan';
import { Archive, Pencil } from 'lucide-react';
import Link from 'next/link';

interface ClubsTableProps {
  clubs: Club[];
  isLoading: boolean;
  error: string;
  onEditClub: (club: Club) => void;
  onArchiveClub: (club: Club) => void;
}

export default function ClubsTable({
  clubs,
  isLoading,
  error,
  onEditClub,
  onArchiveClub,
}: ClubsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <HeaderCell>CLB/tổ</HeaderCell>
            <HeaderCell>Mảng</HeaderCell>
            <HeaderCell>Thành viên</HeaderCell>
            <HeaderCell>Chủ nhiệm</HeaderCell>
            <HeaderCell>Trạng thái</HeaderCell>
            <HeaderCell>Thao tác</HeaderCell>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {isLoading ? (
            <tr>
              <td className="px-5 py-10" colSpan={6}>
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
                  <Sharingan size={18} label="Đang tải CLB/tổ" />
                  Đang tải CLB/tổ
                </div>
              </td>
            </tr>
          ) : error ? (
            <EmptyRow className="text-red-600">{error}</EmptyRow>
          ) : clubs.length > 0 ? (
            clubs.map((club) => (
              <tr
                key={club.id}
                className={`hover:bg-slate-50 ${club.archivedAt ? 'bg-slate-50/70 text-slate-500' : ''}`}
              >
                <td className="px-5 py-4">
                  <Link
                    href={getAdminItemPath('clubs', club)}
                    className="font-semibold text-slate-950 hover:text-cyan-700"
                  >
                    {club.name}
                  </Link>
                  <p className="mt-1 max-w-md text-sm font-medium text-slate-500">
                    {club.description || 'Chưa có mô tả'}
                  </p>
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                  {club.divisionName}
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                  {club.memberCount}
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {club.leads.length > 0 ? club.leads.map((lead) => lead.name).join(', ') : '-'}
                </td>
                <td className="px-5 py-4">
                  {club.archivedAt ? (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Đã lưu trữ
                    </span>
                  ) : (
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                      Đang hoạt động
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onEditClub(club)}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
                    >
                      <Pencil className="h-4 w-4" />
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => onArchiveClub(club)}
                      disabled={Boolean(club.archivedAt)}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Archive className="h-4 w-4" />
                      Lưu trữ
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <EmptyRow>Chưa có CLB/tổ.</EmptyRow>
          )}
        </tbody>
      </table>
    </div>
  );
}

function HeaderCell({ children }: { children: string }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">{children}</th>
  );
}

function EmptyRow({
  children,
  className = 'text-slate-500',
}: {
  children: string;
  className?: string;
}) {
  return (
    <tr>
      <td className={`px-5 py-10 text-center text-sm font-medium ${className}`} colSpan={6}>
        {children}
      </td>
    </tr>
  );
}
