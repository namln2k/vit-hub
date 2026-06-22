import { getPersonName } from '@/features/super-admin/components/event/eventManagementUtils';
import type { OrganizationEventParticipant } from '@/services/organizationAdmin';
import Sharingan from '@/shared/loading/Sharingan';
import { Check, ShieldCheck, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';

export type EventParticipantMode = 'participants' | 'attendance';

export function EventParticipantModeTabs({
  activeMode,
  onChange,
}: {
  activeMode: EventParticipantMode;
  onChange: (mode: EventParticipantMode) => void;
}) {
  return (
    <div className="border-b border-slate-200 px-5 py-3">
      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        <ModeButton
          isActive={activeMode === 'participants'}
          icon={<UsersRound className="h-4 w-4" />}
          label="Participants"
          onClick={() => onChange('participants')}
        />
        <ModeButton
          isActive={activeMode === 'attendance'}
          icon={<Check className="h-4 w-4" />}
          label="Attendance"
          onClick={() => onChange('attendance')}
        />
      </div>
    </div>
  );
}

export function EventLeadTransferModal({
  currentLead,
  transferTarget,
  pendingAction,
  onCancel,
  onConfirm,
}: {
  currentLead?: OrganizationEventParticipant;
  transferTarget: OrganizationEventParticipant;
  pendingAction: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-event-lead-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 id="transfer-event-lead-title" className="text-lg font-bold text-slate-950">
            Chuyển giao event lead
          </h3>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm font-medium text-slate-600">
          <p>
            Event lead hiện tại:{' '}
            <span className="font-semibold text-slate-950">
              {currentLead ? getPersonName(currentLead) : 'Chưa có'}
            </span>
          </p>
          <p>
            Người nhận:{' '}
            <span className="font-semibold text-slate-950">{getPersonName(transferTarget)}</span>
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={Boolean(pendingAction)}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={Boolean(pendingAction)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {pendingAction.startsWith('transfer-lead') ? (
              <Sharingan size={16} label="Đang chuyển giao event lead" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Chuyển giao
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  isActive,
  icon,
  label,
  onClick,
}: {
  isActive: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${
        isActive ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
