import { createClub, updateClub, type Club } from '@/services/clubs';
import type { Division } from '@/services/divisions';
import Sharingan from '@/shared/loading/Sharingan';
import { Check, Save, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ClubFormModalProps {
  club?: Club;
  divisions: Division[];
  initialDivisionId?: string;
  onClose: () => void;
  onSaved: (club: Club) => void;
}

export default function ClubFormModal({
  club,
  divisions,
  initialDivisionId = '',
  onClose,
  onSaved,
}: ClubFormModalProps) {
  const isEditing = Boolean(club);
  const [divisionId, setDivisionId] = useState(club?.divisionId ?? initialDivisionId);
  const [name, setName] = useState(club?.name ?? '');
  const [description, setDescription] = useState(club?.description ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const hasChanges =
    !club ||
    divisionId !== club.divisionId ||
    trimmedName !== club.name ||
    trimmedDescription !== club.description.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!divisionId) {
      setError('Chọn mảng parent cho CLB/tổ.');
      return;
    }

    if (!trimmedName) {
      setError('Tên CLB/tổ không được để trống.');
      return;
    }

    if (!hasChanges) {
      onClose();
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const savedClub = club
        ? await updateClub(club.id, divisionId, trimmedName, trimmedDescription)
        : await createClub(divisionId, trimmedName, trimmedDescription);
      onSaved(savedClub);
      toast.success(isEditing ? 'Đã cập nhật CLB/tổ.' : 'Đã tạo CLB/tổ mới.', {
        id: isEditing ? 'club-update-success' : 'club-create-success',
      });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : '';
      const actionText = isEditing ? 'cập nhật' : 'tạo';
      toast.error(
        message
          ? `Không thể ${actionText} CLB/tổ: ${message}`
          : `Không thể ${actionText} CLB/tổ.`,
        { id: isEditing ? 'club-update-error' : 'club-create-error' },
      );
    } finally {
      setIsSaving(false);
    }
  }

  const title = isEditing ? 'Chỉnh sửa CLB/tổ' : 'Tạo CLB/tổ mới';
  const submitText = isEditing ? 'Lưu' : 'Tạo CLB/tổ';
  const modalTitleId = isEditing ? 'edit-club-title' : 'create-club-title';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id={modalTitleId} className="text-lg font-bold text-slate-950">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Mảng parent</span>
            <select
              value={divisionId}
              onChange={(event) => {
                setDivisionId(event.target.value);
                setError('');
              }}
              disabled={isSaving}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="">Chọn mảng</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Tên CLB/tổ</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
              disabled={isSaving}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="VD: CLB Pickleball"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Mô tả</span>
            <textarea
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setError('');
              }}
              disabled={isSaving}
              className="min-h-24 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="Mô tả ngắn về CLB/tổ"
            />
          </label>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving || !divisionId || !trimmedName}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving ? (
              <Sharingan size={16} label="Đang lưu CLB/tổ" />
            ) : isEditing ? (
              <Save className="h-4 w-4" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {submitText}
          </button>
        </div>
      </form>
    </div>
  );
}
