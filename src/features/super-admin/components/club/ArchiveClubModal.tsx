import { archiveClub, type Club } from '@/services/clubs';
import Sharingan from '@/shared/loading/Sharingan';
import { Archive, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ArchiveClubModalProps {
  club: Club;
  onClose: () => void;
  onArchived: (club: Club) => void;
}

export default function ArchiveClubModal({ club, onClose, onArchived }: ArchiveClubModalProps) {
  const [isArchiving, setIsArchiving] = useState(false);

  async function handleArchive() {
    setIsArchiving(true);

    try {
      const archivedClub = await archiveClub(club.id);
      onArchived(archivedClub);
      toast.success('Đã lưu trữ CLB/tổ.', { id: 'club-archive-success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(
        message ? `Không thể lưu trữ CLB/tổ: ${message}` : 'Không thể lưu trữ CLB/tổ.',
        { id: 'club-archive-error' },
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
      aria-labelledby="archive-club-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isArchiving) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="archive-club-title" className="text-lg font-bold text-slate-950">
              Lưu trữ CLB/tổ
            </h2>
            <p className="mt-1 truncate text-sm font-medium text-slate-500">{club.name}</p>
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

        <div className="space-y-3 px-5 py-4">
          <p className="text-sm font-medium text-slate-700">
            CLB/tổ đã lưu trữ vẫn còn lịch sử membership và chức vụ, nhưng sẽ được tách khỏi danh
            sách đang hoạt động.
          </p>
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
            disabled={isArchiving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isArchiving ? (
              <Sharingan size={16} label="Đang lưu trữ CLB/tổ" />
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
