import { Plus, Search, Trash2 } from 'lucide-react';

interface DivisionPanelActionsProps {
  search: string;
  isMemberView: boolean;
  isLoadingUsers: boolean;
  selectedUserCount: number;
  onSearchChange: (value: string) => void;
  onOpenAddUsersModal: () => void;
  onOpenRemoveUsersModal: () => void;
}

export default function DivisionPanelActions({
  search,
  isMemberView,
  isLoadingUsers,
  selectedUserCount,
  onSearchChange,
  onOpenAddUsersModal,
  onOpenRemoveUsersModal,
}: DivisionPanelActionsProps) {
  return (
    <>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm kiếm"
          className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 sm:w-64"
        />
      </label>
      {isMemberView && (
        <>
          <button
            type="button"
            onClick={onOpenRemoveUsersModal}
            disabled={selectedUserCount === 0 || isLoadingUsers}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"
          >
            <Trash2 className="h-4 w-4" />
            Xóa{selectedUserCount > 0 ? ` ${selectedUserCount}` : ''}
          </button>
          <button
            type="button"
            onClick={onOpenAddUsersModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Thêm
          </button>
        </>
      )}
    </>
  );
}
