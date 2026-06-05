import Sharingan from '@/shared/loading/Sharingan';
import { Trash2, X } from 'lucide-react';

interface ConfirmRemoveUsersModalProps {
  contextName: string;
  contextType: 'division' | 'group';
  selectedCount: number;
  isRemoving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const CONTEXT_LABELS = {
  division: 'mảng',
  group: 'nhóm',
};

export default function ConfirmRemoveUsersModal({
  contextName,
  contextType,
  selectedCount,
  isRemoving,
  onCancel,
  onConfirm,
}: ConfirmRemoveUsersModalProps) {
  const contextLabel = CONTEXT_LABELS[contextType];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-users-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isRemoving) {
          onCancel();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="remove-users-title" className="text-lg font-bold text-slate-950">
              Xóa thành viên khỏi {contextLabel}
            </h2>
            <p className="mt-1 truncate text-sm font-medium text-slate-500">{contextName}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isRemoving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="text-sm font-medium text-slate-700">
            Bạn có chắc muốn xóa {selectedCount} thành viên đã chọn khỏi {contextLabel} này không?
          </p>
          <p className="text-sm text-slate-500">
            Thao tác này chỉ gỡ thành viên khỏi {contextLabel}, không xóa tài khoản người dùng.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isRemoving}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRemoving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isRemoving ? (
              <Sharingan size={16} label="Đang xóa thành viên" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}
