import { ROLE_LABELS } from '@/features/organization-structure/permissions';
import {
  fromVietnamDateTimeLocalValue,
  toVietnamDateTimeLocalValue,
} from '@/features/super-admin/lib/vietnamDateTime';
import { getFullName } from '@/features/super-admin/lib/userUtils';
import { X } from 'lucide-react';
import { useState } from 'react';
import type {
  RoleActionDialogState,
  ScopeMembersTableProps,
} from '@/features/super-admin/components/common/scopeMemberTypes';

interface RoleActionModalProps {
  action: NonNullable<RoleActionDialogState>;
  onClose: () => void;
  onAssignRole: ScopeMembersTableProps['onAssignRole'];
  onRemoveRole: ScopeMembersTableProps['onRemoveRole'];
}

export default function ScopeMemberRoleActionModal({
  action,
  onClose,
  onAssignRole,
  onRemoveRole,
}: RoleActionModalProps) {
  const [startsAtValue, setStartsAtValue] = useState(() => toVietnamDateTimeLocalValue(new Date()));
  const [endsAtValue, setEndsAtValue] = useState('');
  const [endedAtValue, setEndedAtValue] = useState(() => toVietnamDateTimeLocalValue(new Date()));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const isAssigning = action.mode === 'assign';
  const isLeadRole =
    action.roleKey === 'division_lead' ||
    action.roleKey === 'group_lead' ||
    action.roleKey === 'club_lead';

  async function handleSubmit() {
    setError('');

    try {
      setIsSaving(true);

      if (isAssigning) {
        const startsAt = fromVietnamDateTimeLocalValue(startsAtValue);
        const endsAt = endsAtValue ? fromVietnamDateTimeLocalValue(endsAtValue) : null;

        if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
          setError('Thời điểm kết thúc phải sau thời điểm bắt đầu.');
          return;
        }

        await onAssignRole(action.user.uid, action.roleKey, startsAt, endsAt);
      } else {
        await onRemoveRole(
          action.user.uid,
          action.roleKey,
          fromVietnamDateTimeLocalValue(endedAtValue),
        );
      }

      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể cập nhật chức vụ.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              {isAssigning ? 'Bổ nhiệm chức vụ' : 'Kết thúc chức vụ'}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {getFullName(action.user)} · {ROLE_LABELS[action.roleKey]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Đóng"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {isAssigning ? (
            <>
              {isLeadRole && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  Nếu scope đã có cấp trưởng trùng thời gian, thao tác này sẽ bị từ chối. Hãy dùng
                  luồng chuyển giao trưởng để thay thế cấp trưởng hiện tại.
                </p>
              )}
              <DateTimeField
                label="Bắt đầu"
                value={startsAtValue}
                onChange={setStartsAtValue}
                disabled={isSaving}
              />
              <DateTimeField
                label="Kết thúc"
                value={endsAtValue}
                onChange={setEndsAtValue}
                disabled={isSaving}
                optional
              />
            </>
          ) : (
            <DateTimeField
              label="Kết thúc lúc"
              value={endedAtValue}
              onChange={setEndedAtValue}
              disabled={isSaving}
            />
          )}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving ? 'Đang lưu' : isAssigning ? 'Bổ nhiệm' : 'Kết thúc'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DateTimeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  optional?: boolean;
}

function DateTimeField({ label, value, onChange, disabled, optional = false }: DateTimeFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">
        {label}
        {optional ? <span className="font-medium text-slate-400"> (tùy chọn)</span> : null}
      </span>
      <input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </label>
  );
}
