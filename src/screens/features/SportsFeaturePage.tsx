'use client';

import { APP_ROUTES, getSportGameManagementPath, getPublicSportGamePath } from '@/constants/routes';
import { ArrowLeft, CalendarDays, Clock, ExternalLink, MapPin, Plus, Users, X } from 'lucide-react';
import { createSportGame, listMySportGames, type CreateSportGameData } from '@/services/sports';
import type { SportGameBucket, SportGameSummary } from '@/features/sports/types';
import {
  DEFAULT_SPORT_TYPE,
  SPORT_TYPE_OPTIONS,
  getSportTypeLabel,
} from '@/features/sports/sportTypes';
import { SPORT_TYPE_ICONS, SPORT_TYPE_THEMES } from '@/features/sports/sportTypeUi';
import Link from 'next/link';
import Sharingan from '@/shared/loading/Sharingan';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const emptyForm: CreateSportGameData = {
  type: DEFAULT_SPORT_TYPE,
  name: '',
  gameDate: '',
  gameTime: '',
  locationName: '',
  locationUrl: '',
  costSharingEnabled: false,
};

const bucketLabels: Record<SportGameBucket, string> = {
  upcoming: 'Sắp diễn ra',
  finished: 'Đã kết thúc',
  deleted: 'Đã hủy',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function groupGames(games: SportGameSummary[]) {
  return games.reduce<Record<SportGameBucket, SportGameSummary[]>>(
    (groups, game) => {
      groups[game.bucket].push(game);
      return groups;
    },
    {
      upcoming: [],
      finished: [],
      deleted: [],
    },
  );
}

interface GameCardProps {
  game: SportGameSummary;
}

function GameCard({ game }: GameCardProps) {
  const publicPath = getPublicSportGamePath(game.id);
  const theme = SPORT_TYPE_THEMES[game.type];
  const sportIcon = SPORT_TYPE_ICONS[game.type];
  const sportLabel = getSportTypeLabel(game.type);

  return (
    <article className={`rounded-lg border bg-white p-4 shadow-sm ${theme.border}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-2">
            <img src={sportIcon.src} alt="" className="mt-0.5 h-6 w-6 shrink-0" />
            <div className="min-w-0">
              <Link
                href={getSportGameManagementPath(game.id)}
                className={`wrap-break-word text-base font-bold text-slate-950 transition-colors ${theme.hover}`}
              >
                {game.name}
              </Link>
              <p className="mt-1 text-sm font-medium text-slate-600">Host: {game.hostName}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`w-fit rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap ${theme.badge}`}
          >
            {sportLabel}
          </span>
          <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 whitespace-nowrap">
            {bucketLabels[game.bucket]}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm font-medium text-slate-600 sm:grid-cols-2">
        <span className="inline-flex items-center gap-2">
          <CalendarDays className={`h-4 w-4 ${theme.icon}`} />
          {formatDate(game.gameDate)}
        </span>
        <span className="inline-flex items-center gap-2">
          <Clock className={`h-4 w-4 ${theme.icon}`} />
          {game.gameTime ? game.gameTime.slice(0, 5) : 'Cả ngày'}
        </span>
        <span className="inline-flex items-center gap-2 sm:col-span-2">
          <MapPin className={`h-4 w-4 ${theme.icon}`} />
          {game.locationName || 'Chưa có địa điểm'}
        </span>
        <span className="inline-flex items-center gap-2">
          <Users className={`h-4 w-4 ${theme.icon}`} />
          {game.activeParticipantCount} người tham gia
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href={getSportGameManagementPath(game.id)}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Quản lý
        </Link>
        <Link
          href={publicPath}
          target="_blank"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ExternalLink className="h-4 w-4" />
          Link công khai
        </Link>
      </div>
    </article>
  );
}

function GamesLoadingOverlay() {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-slate-950/20 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
      aria-label="Đang tải kèo"
    >
      <div className="rounded-full shadow-lg ring-1 ring-slate-200">
        <Sharingan size={64} label="Đang tải kèo" />
      </div>
    </div>
  );
}

interface CreateGameFormProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateGameForm({ onClose, onCreated }: CreateGameFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<CreateSportGameData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  function updateForm<Key extends keyof CreateSportGameData>(
    key: Key,
    value: CreateSportGameData[Key],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.gameDate) {
      toast.error('Vui lòng chọn ngày chơi.', { id: 'sports-create-date-error' });
      return;
    }

    try {
      setIsSaving(true);
      const result = await createSportGame(form);
      toast.success('Đã tạo kèo.', { id: 'sports-create-success' });
      onCreated();
      router.push(result.managementPath);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo kèo.', {
        id: 'sports-create-error',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-950">Tạo kèo</h2>
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Đóng form tạo kèo"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Loại kèo</span>
          <select
            value={form.type}
            onChange={(event) =>
              updateForm('type', event.target.value as CreateSportGameData['type'])
            }
            disabled={isSaving}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            required
          >
            {SPORT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Tên kèo tuỳ chọn</span>
          <input
            value={form.name}
            onChange={(event) => updateForm('name', event.target.value)}
            disabled={isSaving}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            placeholder="Bỏ trống để tự tạo tên"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Ngày chơi</span>
          <input
            type="date"
            value={form.gameDate}
            onChange={(event) => updateForm('gameDate', event.target.value)}
            disabled={isSaving}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Giờ chơi</span>
          <input
            type="time"
            value={form.gameTime}
            onChange={(event) => updateForm('gameTime', event.target.value)}
            disabled={isSaving}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Tên địa điểm</span>
          <input
            value={form.locationName}
            onChange={(event) => updateForm('locationName', event.target.value)}
            disabled={isSaving}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            placeholder="VD: Sân Bách Khoa"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Link địa điểm</span>
          <input
            value={form.locationUrl}
            onChange={(event) => updateForm('locationUrl', event.target.value)}
            disabled={isSaving}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
            placeholder="https://maps..."
          />
        </label>

        <label className="flex items-center gap-3 md:col-span-2">
          <input
            type="checkbox"
            checked={form.costSharingEnabled}
            onChange={(event) => updateForm('costSharingEnabled', event.target.checked)}
            disabled={isSaving}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm font-semibold text-slate-700">Bật chia chi phí</span>
        </label>
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
          <Plus className="h-4 w-4" />
          {isSaving ? 'Đang tạo...' : 'Tạo kèo'}
        </button>
      </div>
    </form>
  );
}

export default function SportsFeaturePage() {
  const [games, setGames] = useState<SportGameSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const groupedGames = useMemo(() => groupGames(games), [games]);

  const loadGames = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const nextGames = await listMySportGames();
      setGames(nextGames);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách kèo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href={APP_ROUTES.features}
              className="h-9 mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Tính năng
            </Link>
            <h1 className="text-2xl font-black tracking-normal text-slate-950">Host kèo</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
              Quản lý các kèo bạn host, tham gia, hoặc từng tham gia.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Tạo kèo
          </button>
        </div>
      </section>

      {isCreateOpen ? (
        <CreateGameForm
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            setIsCreateOpen(false);
            void loadGames();
          }}
        />
      ) : null}

      <section className="relative min-h-52">
        {isLoading ? <GamesLoadingOverlay /> : null}
        <div className="grid gap-5 lg:grid-cols-3">
          {(Object.keys(bucketLabels) as SportGameBucket[]).map((bucket) => (
            <div
              key={bucket}
              className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-950">{bucketLabels[bucket]}</h2>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                  {groupedGames[bucket].length}
                </span>
              </div>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {error}
                </p>
              ) : groupedGames[bucket].length > 0 ? (
                <div className="space-y-3">
                  {groupedGames[bucket].map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-500">
                  Chưa có kèo.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
