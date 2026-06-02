import { Check, Pencil, X } from 'lucide-react';

interface EditButtonProps {
  label: string;
  onClick: () => void;
}

interface ConfirmCancelActionsProps {
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
}

export function EditButton({ label, onClick }: EditButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-indigo-600"
      title={label}
    >
      <Pencil className="h-4 w-4" />
    </button>
  );
}

export function ConfirmCancelActions({
  saving,
  onCancel,
  onSave,
  saveLabel,
}: ConfirmCancelActionsProps) {
  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        title={saveLabel ?? 'Xác nhận'}
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
        title="Hủy"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
