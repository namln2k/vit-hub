import type { SportManagementGame, SportParticipant } from '@/features/sports/types';
import { leaveSportGame, runSportMemberAction } from '@/services/sports';
import { Shield, Trash2, UserMinus } from 'lucide-react';

const roleLabels = {
  host: 'Host',
  co_host: 'Co-host',
  participant: 'Thành viên',
} as const;

const statusLabels = {
  active: 'Đang tham gia',
  left: 'Đã rời',
  kicked: 'Đã bị kick',
} as const;

const statusBadgeClasses = {
  active: 'bg-emerald-100 text-emerald-700',
  left: 'bg-slate-100 text-slate-700',
  kicked: 'bg-red-100 text-red-700',
} as const;

interface SportManagementParticipantsPanelProps {
  game: SportManagementGame;
  participants: SportParticipant[];
  pendingAction: string;
  canManageMembers: boolean;
  canPromote: boolean;
  canTransfer: boolean;
  onRunAction: (actionId: string, action: () => Promise<unknown>, successMessage: string) => void;
}

export default function SportManagementParticipantsPanel({
  game,
  participants,
  pendingAction,
  canManageMembers,
  canPromote,
  canTransfer,
  onRunAction,
}: SportManagementParticipantsPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-slate-950">Người tham gia</h2>
        {game.currentUserStatus === 'active' &&
        game.currentUserRole !== 'host' &&
        !game.isExpired &&
        !game.deletedAt ? (
          <button
            type="button"
            onClick={() => onRunAction('leave', () => leaveSportGame(game.id), 'Đã rời kèo.')}
            disabled={Boolean(pendingAction)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserMinus className="h-4 w-4" />
            Rời kèo
          </button>
        ) : null}
      </div>
      <div className="divide-y divide-slate-200">
        {participants.map((participant) => {
          const isSelf = participant.id === game.currentUserMemberId;
          const canKickParticipant = canManageMembers && !isSelf;
          const canPromoteParticipant =
            canPromote &&
            participant.status === 'active' &&
            !participant.isGuest &&
            participant.role === 'participant';
          const canDemoteParticipant =
            canPromote && participant.status === 'active' && participant.role === 'co_host';
          const canTransferParticipant =
            canTransfer && participant.status === 'active' && !participant.isGuest && !isSelf;

          return (
            <div key={participant.id} className="flex flex-col gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="wrap-break-word text-sm font-bold text-slate-950">
                  {participant.name}
                  {participant.isGuest ? (
                    <span className="ml-2 text-xs font-bold text-slate-500">Khách</span>
                  ) : null}
                </p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                    {roleLabels[participant.role]}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 ${statusBadgeClasses[participant.status]}`}
                  >
                    {statusLabels[participant.status]}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canPromoteParticipant ? (
                  <button
                    type="button"
                    onClick={() =>
                      onRunAction(
                        `promote-${participant.id}`,
                        () => runSportMemberAction(game.id, participant.id, 'promote'),
                        'Đã promote co-host.',
                      )
                    }
                    disabled={Boolean(pendingAction)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Shield className="h-4 w-4" />
                    Promote
                  </button>
                ) : null}
                {canDemoteParticipant ? (
                  <button
                    type="button"
                    onClick={() =>
                      onRunAction(
                        `demote-${participant.id}`,
                        () => runSportMemberAction(game.id, participant.id, 'demote'),
                        'Đã demote co-host.',
                      )
                    }
                    disabled={Boolean(pendingAction)}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Demote
                  </button>
                ) : null}
                {canTransferParticipant ? (
                  <button
                    type="button"
                    onClick={() =>
                      onRunAction(
                        `transfer-${participant.id}`,
                        () => runSportMemberAction(game.id, participant.id, 'transfer'),
                        'Đã chuyển host.',
                      )
                    }
                    disabled={Boolean(pendingAction)}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Chuyển host
                  </button>
                ) : null}
                {canKickParticipant && participant.status === 'active' ? (
                  <button
                    type="button"
                    onClick={() =>
                      onRunAction(
                        `kick-${participant.id}`,
                        () => runSportMemberAction(game.id, participant.id, 'kick'),
                        participant.isGuest ? 'Đã xóa khách.' : 'Đã kick thành viên.',
                      )
                    }
                    disabled={Boolean(pendingAction)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    {participant.isGuest ? 'Xóa khách' : 'Kick'}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
