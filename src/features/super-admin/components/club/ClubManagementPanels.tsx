import type { Club } from '@/services/clubs';
import type { Division } from '@/services/divisions';
import { Archive, Pencil, Plus, Search, UserPlus, UsersRound } from 'lucide-react';

interface ClubListActionsProps {
  search: string;
  divisionFilter: string;
  divisions: Division[];
  includeArchived: boolean;
  onSearchChange: (value: string) => void;
  onDivisionFilterChange: (value: string) => void;
  onIncludeArchivedChange: (value: boolean) => void;
  onCreate: () => void;
}

export function ClubListActions({
  search,
  divisionFilter,
  divisions,
  includeArchived,
  onSearchChange,
  onDivisionFilterChange,
  onIncludeArchivedChange,
  onCreate,
}: ClubListActionsProps) {
  return (
    <>
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm CLB/tổ"
          className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-500 sm:w-56"
        />
      </label>
      <select
        value={divisionFilter}
        onChange={(event) => onDivisionFilterChange(event.target.value)}
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-cyan-500"
      >
        <option value="">Tất cả mảng</option>
        {divisions.map((division) => (
          <option key={division.id} value={division.id}>
            {division.name}
          </option>
        ))}
      </select>
      <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(event) => onIncludeArchivedChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
        />
        Đã lưu trữ
      </label>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
      >
        <Plus className="h-4 w-4" />
        Tạo CLB/tổ
      </button>
    </>
  );
}

interface ClubDetailActionsProps {
  search: string;
  selectedUserCount: number;
  isArchived: boolean;
  canManageMembers: boolean;
  onSearchChange: (value: string) => void;
  onEdit: () => void;
  onArchive: () => void;
  onOpenAddUsersModal: () => void;
  onOpenRemoveUsersModal: () => void;
}

export function ClubDetailActions({
  search,
  selectedUserCount,
  isArchived,
  canManageMembers,
  onSearchChange,
  onEdit,
  onArchive,
  onOpenAddUsersModal,
  onOpenRemoveUsersModal,
}: ClubDetailActionsProps) {
  return (
    <>
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm thành viên"
          className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-500 sm:w-56"
        />
      </label>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        <Pencil className="h-4 w-4" />
        Sửa
      </button>
      <button
        type="button"
        onClick={onArchive}
        disabled={!canManageMembers || isArchived}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Archive className="h-4 w-4" />
        Lưu trữ
      </button>
      <button
        type="button"
        onClick={onOpenAddUsersModal}
        disabled={isArchived}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        <UserPlus className="h-4 w-4" />
        Thêm
      </button>
      <button
        type="button"
        onClick={onOpenRemoveUsersModal}
        disabled={!canManageMembers || selectedUserCount === 0 || isArchived}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
      >
        <UsersRound className="h-4 w-4" />
        Kết thúc {selectedUserCount > 0 ? selectedUserCount : ''}
      </button>
    </>
  );
}

export function ClubDetailSummary({ club }: { club: Club }) {
  return (
    <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 md:grid-cols-4">
      <SummaryItem label="Mảng" value={club.divisionName} />
      <SummaryItem label="Thành viên" value={String(club.memberCount)} />
      <SummaryItem
        label="Chủ nhiệm"
        value={club.leads.length > 0 ? club.leads.map((lead) => lead.name).join(', ') : '-'}
      />
      <SummaryItem
        label="Phó chủ nhiệm"
        value={
          club.deputies.length > 0 ? club.deputies.map((deputy) => deputy.name).join(', ') : '-'
        }
      />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
