import {
  fromVietnamDateTimeLocalValue,
  toVietnamDateTimeLocalValue,
} from '@/features/super-admin/lib/vietnamDateTime';
import Sharingan from '@/shared/loading/Sharingan';
import { Archive, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ArchiveScopeModalProps {
  scopeName: string;
  scopeLabel: string;
  onClose: () => void;
  onArchive: (archivedAt: string) => Promise<void>;
  onArchived: (archivedAt: string) => void;
}

export default function ArchiveScopeModal({
  scopeName,
  scopeLabel,
  onClose,
  onArchive,
  onArchived,
}: ArchiveScopeModalProps) {
  const [archivedAtValue, setArchivedAtValue] = useState(() =>
    toVietnamDateTimeLocalValue(new Date()),
  );
  const [isArchiving, setIsArchiving] = useState(false);

  async function handleArchive() {
    if (!archivedAtValue.trim()) {
      return;
    }

    setIsArchiving(true);

    try {
      const archivedAt = fromVietnamDateTimeLocalValue(archivedAtValue);
      await onArchive(archivedAt);
      onArchived(archivedAt);
      toast.success(`Đã lưu trữ ${scopeLabel}.`, { id: 'scope-archive-success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(
        message
          ? `Không thể lưu trữ ${scopeLabel}: ${message}`
          : `Không thể lưu trữ ${scopeLabel}.`,
        {
          id: 'scope-archive-error',
        },
      );
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-scope-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isArchiving) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="archive-scope-title" className="text-lg font-bold text-slate-950">
              Lưu trữ {scopeLabel}
            </h2>
            <p className="mt-1 truncate text-sm font-medium text-slate-500">{scopeName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isArchiving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-sm font-medium leading-6 text-slate-700">
            Khi lưu trữ, hệ thống sẽ đặt archived_at theo thời điểm dưới đây và kết thúc các
            memberships/chức vụ đang hiệu lực trong scope tại cùng thời điểm. Nếu scope còn event
            owner hoặc mảng còn CLB/tổ con đang hoạt động, thao tác sẽ bị chặn.
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Thời điểm lưu trữ
            </span>
            <input
              type="datetime-local"
              value={archivedAtValue}
              onChange={(event) => setArchivedAtValue(event.target.value)}
              disabled={isArchiving}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isArchiving}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={isArchiving || !archivedAtValue.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isArchiving ? (
              <Sharingan size={16} label={`Đang lưu trữ ${scopeLabel}`} />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Lưu trữ
          </button>
        </div>
      </div>
    </div>
  );
}
