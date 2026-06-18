import {
  deleteOrganizationEvent,
  formatOrganizationEventApiError,
  type OrganizationEvent,
} from '@/services/organizationAdmin';
import Sharingan from '@/shared/loading/Sharingan';
import { Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DeleteEventModalProps {
  event: OrganizationEvent;
  onClose: () => void;
  onDeleted: (eventId: string) => void;
}

export default function DeleteEventModal({ event, onClose, onDeleted }: DeleteEventModalProps) {
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = confirmation === event.name;

  async function handleDelete() {
    if (!canDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteOrganizationEvent(event.id);
      onDeleted(event.id);
      toast.success('Đã xóa sự kiện.', { id: 'event-delete-success' });
    } catch (deleteError) {
      const message = formatOrganizationEventApiError(deleteError, 'Không thể xóa sự kiện.');
      toast.error(message ? `Không thể xóa sự kiện: ${message}` : 'Không thể xóa sự kiện.', {
        id: 'event-delete-error',
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
      aria-labelledby="delete-event-title"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id="delete-event-title" className="text-lg font-bold text-slate-950">
            Xóa sự kiện
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
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm font-medium text-slate-600">
            Sự kiện <span className="font-semibold text-slate-950">{event.name}</span> sẽ bị xóa
            vĩnh viễn. Event memberships và role assignments phụ thuộc sẽ bị xóa theo cascade.
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Nhập chính xác tên sự kiện để xác nhận
            </span>
            <input
              value={confirmation}
              onChange={(changeEvent) => setConfirmation(changeEvent.target.value)}
              disabled={isDeleting}
              className="h-11 w-full rounded-lg border border-red-200 px-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-red-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder={event.name}
            />
          </label>
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
            disabled={isDeleting || !canDelete}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isDeleting ? (
              <Sharingan size={16} label="Đang xóa sự kiện" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Xóa vĩnh viễn
          </button>
        </div>
      </div>
    </div>
  );
}
