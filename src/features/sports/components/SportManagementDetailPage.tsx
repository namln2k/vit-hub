'use client';

import { APP_ROUTES, getPublicSportGamePath } from '@/constants/routes';
import SportCostManagementPanel from '@/features/sports/components/SportCostManagementPanel';
import SportManagementParticipantsPanel from '@/features/sports/components/SportManagementParticipantsPanel';
import type { SportManagementGame, SportParticipant, SportType } from '@/features/sports/types';
import { SPORT_TYPE_OPTIONS, getSportTypeLabel } from '@/features/sports/sportTypes';
import { SPORT_TYPE_ICONS, SPORT_TYPE_THEMES } from '@/features/sports/sportTypeUi';
import {
  getSportManagementGame,
  restoreSportGame,
  softDeleteSportGame,
  updateSportGame,
  type CreateSportGameData,
} from '@/services/sports';
import Sharingan from '@/shared/loading/Sharingan';
import {
  ArrowLeft,
  CalendarDays,
  Crown,
  ExternalLink,
  MapPin,
  RotateCcw,
  Save,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

interface SportManagementDetailPageProps {
  gameId: string;
}

function RequiredMark() {
  return (
    <span className="ml-1 text-red-600" aria-hidden="true">
      *
    </span>
  );
}

const typeAccentEffects: Record<SportType, string> = {
  badminton: 'border-emerald-300 shadow-emerald-200 ring-emerald-300/60',
  pickleball: 'border-violet-300 shadow-violet-200 ring-violet-300/60',
  swimming: 'border-cyan-300 shadow-cyan-200 ring-cyan-300/60',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function getEditForm(game: SportManagementGame): CreateSportGameData {
  return {
    type: game.type,
    name: game.name,
    gameDate: game.gameDate,
    gameTime: game.gameTime ? game.gameTime.slice(0, 5) : '',
    locationName: game.locationName,
    locationUrl: game.locationUrl,
  };
}

function sortParticipants(participants: SportParticipant[]) {
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

export default function SportManagementDetailPage({ gameId }: SportManagementDetailPageProps) {
  const router = useRouter();
  const [game, setGame] = useState<SportManagementGame | null>(null);
  const [editForm, setEditForm] = useState<CreateSportGameData | null>(null);
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
      const nextGame = await getSportManagementGame(gameId);
      setGame(nextGame);
      setEditForm(getEditForm(nextGame));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải kèo.');
      setGame(null);
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadGame();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadGame]);

  async function runAction(
    actionId: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ) {
    try {
      setPendingAction(actionId);
      await action();
      toast.success(successMessage, { id: `sports-${actionId}-success` });
      await loadGame();
      router.refresh();
    } catch (actionError) {
      toast.error(
        actionError instanceof Error ? actionError.message : 'Không thể thực hiện thao tác.',
        {
          id: `sports-${actionId}-error`,
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

    if (!editForm.name.trim()) {
      toast.error('Tên kèo không được để trống.', {
        id: 'sports-update-validation',
      });
      return;
    }

    try {
      setIsSaving(true);
      await updateSportGame(gameId, editForm);
      toast.success('Đã cập nhật kèo.', { id: 'sports-update-success' });
      await loadGame();
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : 'Không thể cập nhật kèo.', {
        id: 'sports-update-error',
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
          aria-label="Đang tải kèo"
        >
          <div className="rounded-full shadow-lg ring-1 ring-slate-200">
            <Sharingan size={48} label="Đang tải kèo" />
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
          href={APP_ROUTES.sportsFeature}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-100"
        >
          Quay lại dashboard
        </Link>
      </section>
    );
  }

  const publicPath = getPublicSportGamePath(game.id);
  const canEdit = game.permissions.canManageGameDetails;
  const canManageMembers = game.permissions.canManageMembership;
  const canPromote = game.permissions.canPromote;
  const canTransfer = game.permissions.canTransferOwnership;
  const theme = SPORT_TYPE_THEMES[game.type];
  const sportIcon = SPORT_TYPE_ICONS[game.type];
  const sportLabel = getSportTypeLabel(game.type);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              href={APP_ROUTES.sportsFeature}
              className="h-9 mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Host kèo
            </Link>
            <h1 className="wrap-break-word text-2xl font-black tracking-normal text-slate-950">
              {game.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-slate-600">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${theme.badge}`}
              >
                <img src={sportIcon.src} alt="" className="h-4 w-4" />
                {sportLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1">
                <Crown className={`h-4 w-4 ${theme.icon}`} />
                Host: {game.hostName}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1">
                <CalendarDays className={`h-4 w-4 ${theme.icon}`} />
                {formatDate(game.gameDate)} {game.gameTime ? game.gameTime.slice(0, 5) : 'Cả ngày'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1">
                <Users className={`h-4 w-4 ${theme.icon}`} />
                {activeParticipants.length} đang tham gia
              </span>
            </div>
            {game.locationName ? (
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                <MapPin className={`h-4 w-4 ${theme.icon}`} />
                {game.locationName}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            {!game.deletedAt ? (
              <Link
                href={publicPath}
                target="_blank"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                Link công khai
              </Link>
            ) : null}
            {game.permissions.canRestore ? (
              <button
                type="button"
                onClick={() =>
                  void runAction('restore', () => restoreSportGame(game.id), 'Đã khôi phục kèo.')
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
                  void runAction('delete', () => softDeleteSportGame(game.id), 'Đã xóa kèo.')
                }
                disabled={Boolean(pendingAction)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Trash2 className="h-4 w-4" />
                Xóa
              </button>
            ) : null}
          </div>
        </div>

        {game.deletedAt ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            Kèo đang bị xóa. Chỉ có thể khôi phục trước khi kèo hết hạn.
          </p>
        ) : game.isExpired ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
            Kèo đã kết thúc. Thông tin kèo và thành viên đã bị khóa.
          </p>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <form
          onSubmit={handleUpdateGame}
          className="rounded-lg border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-950">Thông tin kèo</h2>
          </div>
          <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Loại kèo
                <RequiredMark />
              </span>
              <div className="flex flex-wrap gap-2">
                {SPORT_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setEditForm({
                        ...editForm,
                        type: option.value,
                    })
                  }
                    disabled={!canEdit || isSaving}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
                      SPORT_TYPE_THEMES[option.value].badge
                    } ${
                      editForm.type === option.value
                        ? `scale-[1.08] text-base font-extrabold shadow-md ring-2 ${typeAccentEffects[option.value]}`
                        : 'text-[15px] font-semibold opacity-80 hover:scale-[1.01] hover:shadow-sm'
                    }`}
                    aria-pressed={editForm.type === option.value}
                  >
                    <img src={SPORT_TYPE_ICONS[option.value].src} alt="" className="h-6 w-6" />
                    {option.label}
                  </button>
                ))}
              </div>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Tên kèo
                <RequiredMark />
              </span>
              <input
                value={editForm.name}
                onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                disabled={!canEdit || isSaving}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Ngày chơi
              </span>
              <input
                type="date"
                value={editForm.gameDate}
                onChange={(event) => setEditForm({ ...editForm, gameDate: event.target.value })}
                disabled={!canEdit || isSaving}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Giờ chơi</span>
              <input
                type="time"
                value={editForm.gameTime}
                onChange={(event) => setEditForm({ ...editForm, gameTime: event.target.value })}
                disabled={!canEdit || isSaving}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Tên địa điểm</span>
              <input
                value={editForm.locationName}
                onChange={(event) =>
                  setEditForm({ ...editForm, locationName: event.target.value })
                }
                disabled={!canEdit || isSaving}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Link địa điểm</span>
              <input
                value={editForm.locationUrl}
                onChange={(event) =>
                  setEditForm({ ...editForm, locationUrl: event.target.value })
                }
                disabled={!canEdit || isSaving}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
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

        <SportManagementParticipantsPanel
          game={game}
          participants={participants}
          pendingAction={pendingAction}
          canManageMembers={canManageMembers}
          canPromote={canPromote}
          canTransfer={canTransfer}
          onRunAction={(actionId, action, successMessage) =>
            void runAction(actionId, action, successMessage)
          }
        />
      </div>

      <SportCostManagementPanel gameId={game.id} canManageCosts={game.permissions.canManageCosts} />
    </div>
  );
}
