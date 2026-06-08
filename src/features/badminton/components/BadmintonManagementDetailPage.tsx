'use client';

import { APP_ROUTES, getPublicBadmintonGamePath } from '@/constants/routes';
import BadmintonCostManagementPanel from '@/features/badminton/components/BadmintonCostManagementPanel';
import type { BadmintonManagementGame, BadmintonParticipant } from '@/features/badminton/types';
import {
  getBadmintonManagementGame,
  leaveBadmintonGame,
  restoreBadmintonGame,
  runBadmintonMemberAction,
  softDeleteBadmintonGame,
  updateBadmintonGame,
  type CreateBadmintonGameData,
} from '@/services/badminton';
import Sharingan from '@/shared/loading/Sharingan';
import {
  ArrowLeft,
  CalendarDays,
  Crown,
  ExternalLink,
  MapPin,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  UserMinus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

interface BadmintonManagementDetailPageProps {
  gameId: string;
}

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function getEditForm(game: BadmintonManagementGame): CreateBadmintonGameData {
  return {
    name: game.name,
    gameDate: game.gameDate,
    gameTime: game.gameTime ? game.gameTime.slice(0, 5) : '',
    locationName: game.locationName,
    locationUrl: game.locationUrl,
    costSharingEnabled: game.costSharingEnabled,
  };
}

function sortParticipants(participants: BadmintonParticipant[]) {
  return [...participants].sort((first, second) => {
    const statusRank = { active: 0, left: 1, kicked: 2 };
    const roleRank = { host: 0, co_host: 1, participant: 2 };
    const statusDiff = statusRank[first.status] - statusRank[second.status];

    if (statusDiff !== 0) {
      return statusDiff;
    }

    const roleDiff = roleRank[first.role] - roleRank[second.role];

    if (roleDiff !== 0) {
      return roleDiff;
    }

    return first.name.localeCompare(second.name);
  });
}

export default function BadmintonManagementDetailPage({
  gameId,
}: BadmintonManagementDetailPageProps) {
  const router = useRouter();
  const [game, setGame] = useState<BadmintonManagementGame | null>(null);
  const [editForm, setEditForm] = useState<CreateBadmintonGameData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [error, setError] = useState('');

  const participants = useMemo(
    () => sortParticipants(game?.participants ?? []),
    [game?.participants],
  );
  const activeParticipants = participants.filter((participant) => participant.status === 'active');

  const loadGame = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const nextGame = await getBadmintonManagementGame(gameId);
      setGame(nextGame);
      setEditForm(getEditForm(nextGame));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải kèo cầu lông.');
      setGame(null);
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  async function runAction(
    actionId: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ) {
    try {
      setPendingAction(actionId);
      await action();
      toast.success(successMessage, { id: `badminton-${actionId}-success` });
      await loadGame();
      router.refresh();
    } catch (actionError) {
      toast.error(
        actionError instanceof Error ? actionError.message : 'Không thể thực hiện thao tác.',
        {
          id: `badminton-${actionId}-error`,
        },
      );
    } finally {
      setPendingAction('');
    }
  }

  async function handleUpdateGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editForm) {
      return;
    }

    if (!editForm.name.trim() || !editForm.gameDate) {
      toast.error('Tên kèo và ngày chơi không được để trống.', {
        id: 'badminton-update-validation',
      });
      return;
    }

    try {
      setIsSaving(true);
      await updateBadmintonGame(gameId, editForm);
      toast.success('Đã cập nhật kèo.', { id: 'badminton-update-success' });
      await loadGame();
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : 'Không thể cập nhật kèo.', {
        id: 'badminton-update-error',
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm min-h-36 relative">
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-slate-950/20 backdrop-blur-[1px]"
          role="status"
          aria-live="polite"
          aria-label="Đang tải kèo cầu lông"
        >
          <div className="rounded-full shadow-lg ring-1 ring-slate-200">
            <Sharingan size={48} label="Đang tải kèo cầu lông" />
          </div>
        </div>
      </section>
    );
  }

  if (error || !game || !editForm) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-700">{error || 'Không thể tải kèo.'}</p>
        <Link
          href={APP_ROUTES.badmintonFeature}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-100"
        >
          Quay lại dashboard
        </Link>
      </section>
    );
  }

  const publicPath = getPublicBadmintonGamePath(game.id);
  const canEdit = game.permissions.canManageGameDetails;
  const canManageMembers = game.permissions.canManageMembership;
  const canPromote = game.permissions.canPromote;
  const canTransfer = game.permissions.canTransferOwnership;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              href={APP_ROUTES.badmintonFeature}
              className="h-9 mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Cầu lông
            </Link>
            <h1 className="wrap-break-word text-2xl font-black tracking-normal text-slate-950">
              {game.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1">
                <Crown className="h-4 w-4 text-emerald-600" />
                Host: {game.hostName}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1">
                <CalendarDays className="h-4 w-4 text-emerald-600" />
                {formatDate(game.gameDate)} {game.gameTime ? game.gameTime.slice(0, 5) : 'Cả ngày'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1">
                <Users className="h-4 w-4 text-emerald-600" />
                {activeParticipants.length} đang tham gia
              </span>
            </div>
            {game.locationName ? (
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                <MapPin className="h-4 w-4 text-emerald-600" />
                {game.locationName}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <Link
              href={publicPath}
              target="_blank"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" />
              Link công khai
            </Link>
            {game.permissions.canRestore ? (
              <button
                type="button"
                onClick={() =>
                  void runAction(
                    'restore',
                    () => restoreBadmintonGame(game.id),
                    'Đã khôi phục kèo.',
                  )
                }
                disabled={Boolean(pendingAction)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <RotateCcw className="h-4 w-4" />
                Khôi phục
              </button>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                onClick={() =>
                  void runAction('delete', () => softDeleteBadmintonGame(game.id), 'Đã hủy kèo.')
                }
                disabled={Boolean(pendingAction)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Trash2 className="h-4 w-4" />
                Xóa mềm
              </button>
            ) : null}
          </div>
        </div>

        {game.deletedAt ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            Kèo đang bị xóa mềm. Chỉ có thể khôi phục trước khi kèo hết hạn.
          </p>
        ) : game.isExpired ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
            Kèo đã kết thúc. Thông tin kèo và thành viên đã bị khóa.
          </p>
        ) : null}
      </section>

      <form
        onSubmit={handleUpdateGame}
        className="rounded-lg border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-950">Thông tin kèo</h2>
        </div>
        <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Tên kèo</span>
            <input
              value={editForm.name}
              onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
              disabled={!canEdit || isSaving}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Ngày chơi</span>
            <input
              type="date"
              value={editForm.gameDate}
              onChange={(event) => setEditForm({ ...editForm, gameDate: event.target.value })}
              disabled={!canEdit || isSaving}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Giờ chơi</span>
            <input
              type="time"
              value={editForm.gameTime}
              onChange={(event) => setEditForm({ ...editForm, gameTime: event.target.value })}
              disabled={!canEdit || isSaving}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Tên địa điểm</span>
            <input
              value={editForm.locationName}
              onChange={(event) => setEditForm({ ...editForm, locationName: event.target.value })}
              disabled={!canEdit || isSaving}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Link địa điểm</span>
            <input
              value={editForm.locationUrl}
              onChange={(event) => setEditForm({ ...editForm, locationUrl: event.target.value })}
              disabled={!canEdit || isSaving}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </label>
          <label className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              checked={editForm.costSharingEnabled}
              onChange={(event) =>
                setEditForm({ ...editForm, costSharingEnabled: event.target.checked })
              }
              disabled={!canEdit || isSaving}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
            />
            <span className="text-sm font-semibold text-slate-700">Bật chia chi phí</span>
          </label>
        </div>
        {canEdit ? (
          <div className="flex justify-end border-t border-slate-200 px-5 py-4">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        ) : null}
      </form>

      <BadmintonCostManagementPanel
        gameId={game.id}
        canManageCosts={game.permissions.canManageCosts}
        costSharingEnabled={game.costSharingEnabled}
      />

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-slate-950">Người tham gia</h2>
          {game.currentUserStatus === 'active' &&
          game.currentUserRole !== 'host' &&
          !game.isExpired &&
          !game.deletedAt ? (
            <button
              type="button"
              onClick={() =>
                void runAction('leave', () => leaveBadmintonGame(game.id), 'Đã rời kèo.')
              }
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
              <div
                key={participant.id}
                className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
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
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                      {statusLabels[participant.status]}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canPromoteParticipant ? (
                    <button
                      type="button"
                      onClick={() =>
                        void runAction(
                          `promote-${participant.id}`,
                          () => runBadmintonMemberAction(game.id, participant.id, 'promote'),
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
                        void runAction(
                          `demote-${participant.id}`,
                          () => runBadmintonMemberAction(game.id, participant.id, 'demote'),
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
                        void runAction(
                          `transfer-${participant.id}`,
                          () => runBadmintonMemberAction(game.id, participant.id, 'transfer'),
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
                        void runAction(
                          `kick-${participant.id}`,
                          () => runBadmintonMemberAction(game.id, participant.id, 'kick'),
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
    </div>
  );
}
