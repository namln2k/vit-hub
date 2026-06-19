import { EventVisibility } from '@/features/organization-structure/permissions';
import { fromVietnamDateTimeLocalValue } from '@/features/super-admin/lib/vietnamDateTime';
import {
  OWNER_SCOPE_LABELS,
  getInitialFormState,
  getScopeKey,
  type ScopeOption,
} from '@/features/super-admin/components/event/eventManagementUtils';
import {
  createOrganizationEvent,
  formatOrganizationEventApiError,
  updateOrganizationEvent,
  type OrganizationEvent,
  type OrganizationEventCreateInput,
  type OrganizationEventWriteInput,
} from '@/services/organizationAdmin';
import Sharingan from '@/shared/loading/Sharingan';
import { ShieldCheck, UsersRound, X } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { toast } from 'sonner';

interface EventFormModalProps {
  mode: 'create' | 'edit';
  event?: OrganizationEvent;
  scopeOptions: ScopeOption[];
  onClose: () => void;
  onSaved: (event: OrganizationEvent) => void;
}

export default function EventFormModal({
  mode,
  event,
  scopeOptions,
  onClose,
  onSaved,
}: EventFormModalProps) {
  const isEditing = mode === 'edit';
  const [formState, setFormState] = useState(() => getInitialFormState(event));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedScope = scopeOptions.find(
    (option) => getScopeKey(option) === formState.ownerScopeKey,
  );
  const selectedScopeType =
    isEditing && event ? event.ownerScopeType : (selectedScope?.type ?? 'organization');

  function setField<Key extends keyof typeof formState>(key: Key, value: (typeof formState)[Key]) {
    setFormState((currentState) => ({ ...currentState, [key]: value }));
    setError('');
  }

  function handleOwnerScopeChange(scopeKey: string) {
    const nextScope = scopeOptions.find((option) => getScopeKey(option) === scopeKey);

    setFormState((currentState) => ({
      ...currentState,
      ownerScopeKey: scopeKey,
      visibility: nextScope?.type === 'organization' ? 'organization' : 'scope',
    }));
    setError('');
  }

  async function handleSubmit(formEvent: SubmitEvent<HTMLFormElement>) {
    formEvent.preventDefault();

    if (!formState.name.trim()) {
      setError('Tên sự kiện là bắt buộc.');
      return;
    }

    if (!formState.startsAt) {
      setError('Thời điểm bắt đầu là bắt buộc.');
      return;
    }

    if (!isEditing && !selectedScope) {
      setError('Owner scope không hợp lệ.');
      return;
    }

    const input: OrganizationEventWriteInput = {
      name: formState.name.trim(),
      visibility: formState.visibility,
      showParticipantsPublicly: formState.showParticipantsPublicly,
      startsAt: fromVietnamDateTimeLocalValue(formState.startsAt),
      endsAt: formState.endsAt ? fromVietnamDateTimeLocalValue(formState.endsAt) : null,
      publicLocation: formState.publicLocation.trim(),
      publicDescription: formState.publicDescription.trim(),
      internalNotes: formState.internalNotes.trim(),
    };

    if (input.endsAt && new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
      setError('Thời điểm kết thúc phải sau thời điểm bắt đầu.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const savedEvent =
        isEditing && event
          ? await updateOrganizationEvent(event.id, input)
          : selectedScope
            ? await createOrganizationEvent({
                ...input,
                ownerScopeType: selectedScope.type,
                ownerScopeId: selectedScope.id,
              } satisfies OrganizationEventCreateInput)
            : null;

      if (!savedEvent) {
        setError('Owner scope không hợp lệ.');
        return;
      }

      onSaved(savedEvent);
      toast.success(isEditing ? 'Đã cập nhật sự kiện.' : 'Đã tạo sự kiện.', {
        id: isEditing ? 'event-update-success' : 'event-create-success',
      });
    } catch (saveError) {
      const actionText = isEditing ? 'cập nhật' : 'tạo';
      const message = formatOrganizationEventApiError(
        saveError,
        `Không thể ${actionText} sự kiện.`,
      );
      toast.error(
        message
          ? `Không thể ${actionText} sự kiện: ${message}`
          : `Không thể ${actionText} sự kiện.`,
        { id: isEditing ? 'event-update-error' : 'event-create-error' },
      );
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  const modalTitle = isEditing ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện';
  const modalTitleId = isEditing ? 'edit-event-title' : 'create-event-title';
  const submitText = isEditing ? 'Lưu thay đổi' : 'Tạo sự kiện';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[calc(100vh-3rem)] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id={modalTitleId} className="text-lg font-bold text-slate-950">
            {modalTitle}
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

        <div className="max-h-[calc(100vh-12rem)] space-y-5 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Tên sự kiện</span>
            <input
              autoFocus
              value={formState.name}
              onChange={(changeEvent) => setField('name', changeEvent.target.value)}
              disabled={isSaving}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="VD: Training tháng 6"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            {isEditing && event ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase text-slate-500">Owner scope</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{event.ownerScopeName}</p>
                <p className="text-xs font-medium text-slate-500">
                  {OWNER_SCOPE_LABELS[event.ownerScopeType]} - immutable
                </p>
              </div>
            ) : (
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Owner scope</span>
                <select
                  value={formState.ownerScopeKey}
                  onChange={(changeEvent) => handleOwnerScopeChange(changeEvent.target.value)}
                  disabled={isSaving}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  {scopeOptions.map((option) => (
                    <option key={getScopeKey(option)} value={getScopeKey(option)}>
                      {option.groupLabel}: {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Visibility</span>
              <select
                value={formState.visibility}
                onChange={(changeEvent) =>
                  setField('visibility', changeEvent.target.value as EventVisibility)
                }
                disabled={isSaving}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="organization">Toàn Đội</option>
                <option value="scope">
                  {selectedScopeType === 'organization' ? 'Toàn Đội scope' : 'Owner scope'}
                </option>
                <option value="managers">Managers</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Bắt đầu</span>
              <input
                type="datetime-local"
                value={formState.startsAt}
                onChange={(changeEvent) => setField('startsAt', changeEvent.target.value)}
                disabled={isSaving}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Kết thúc</span>
              <input
                type="datetime-local"
                value={formState.endsAt}
                onChange={(changeEvent) => setField('endsAt', changeEvent.target.value)}
                disabled={isSaving}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
            <input
              type="checkbox"
              checked={formState.showParticipantsPublicly}
              onChange={(changeEvent) =>
                setField('showParticipantsPublicly', changeEvent.target.checked)
              }
              disabled={isSaving}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
            />
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <UsersRound className="h-4 w-4 text-slate-400" />
              Hiển thị danh sách participants công khai
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Địa điểm</span>
            <input
              value={formState.publicLocation}
              onChange={(changeEvent) => setField('publicLocation', changeEvent.target.value)}
              disabled={isSaving}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="Địa điểm hiển thị công khai"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Mô tả công khai
              </span>
              <textarea
                value={formState.publicDescription}
                onChange={(changeEvent) => setField('publicDescription', changeEvent.target.value)}
                disabled={isSaving}
                className="min-h-28 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Ghi chú nội bộ
              </span>
              <textarea
                value={formState.internalNotes}
                onChange={(changeEvent) => setField('internalNotes', changeEvent.target.value)}
                disabled={isSaving}
                className="min-h-28 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
          </div>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
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
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving ? (
              <Sharingan size={16} label="Đang lưu sự kiện" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {submitText}
          </button>
        </div>
      </form>
    </div>
  );
}
