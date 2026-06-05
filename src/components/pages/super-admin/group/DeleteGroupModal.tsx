import { deleteGroup, type Group } from '@/services/groups';
import Sharingan from '@/components/shared/loading/Sharingan';
import { Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DeleteGroupModalProps {
  group: Group;
  onClose: () => void;
  onDeleted: (groupId: string) => void;
}

export default function DeleteGroupModal({ group, onClose, onDeleted }: DeleteGroupModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    try {
      await deleteGroup(group.id);
      onDeleted(group.id);
      toast.success('Đã xóa nhóm.', { id: 'group-delete-success' });
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : '';
      toast.error(message ? `Không thể xóa nhóm: ${message}` : 'Không thể xóa nhóm.', {
        id: 'group-delete-error',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-group-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id="delete-group-title" className="text-lg font-bold text-slate-950">
            Xóa nhóm
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm font-medium text-slate-600">
            Bạn có chắc muốn xóa nhóm{' '}
            <span className="font-semibold text-slate-950">{group.name}</span>?
          </p>
          <p className="text-sm font-medium text-slate-500">
            Thành viên sẽ được gỡ khỏi nhóm này trước khi nhóm bị xóa.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isDeleting ? (
              <Sharingan size={16} label="Đang xóa nhóm" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Xóa nhóm
          </button>
        </div>
      </div>
    </div>
  );
}
