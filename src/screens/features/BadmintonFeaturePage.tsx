'use client';

import {
  APP_ROUTES,
  getBadmintonGameManagementPath,
  getPublicBadmintonGamePath,
} from '@/constants/routes';
import {
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
  Plus,
  Users,
  X,
} from 'lucide-react';
import {
  createBadmintonGame,
  listMyBadmintonGames,
  type CreateBadmintonGameData,
} from '@/services/badminton';
import type { BadmintonGameBucket, BadmintonGameSummary } from '@/features/badminton/types';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const emptyForm: CreateBadmintonGameData = {
  name: '',
  gameDate: '',
  gameTime: '',
  locationName: '',
  locationUrl: '',
  costSharingEnabled: false,
};

const bucketLabels: Record<BadmintonGameBucket, string> = {
  upcoming: 'Sắp diễn ra',
  finished: 'Đã kết thúc',
  deleted: 'Đã xóa mềm',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function groupGames(games: BadmintonGameSummary[]) {
  return games.reduce<Record<BadmintonGameBucket, BadmintonGameSummary[]>>(
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
  game: BadmintonGameSummary;
}

function GameCard({ game }: GameCardProps) {
  const publicPath = getPublicBadmintonGamePath(game.id);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={getBadmintonGameManagementPath(game.id)}
            className="break-words text-base font-bold text-slate-950 transition-colors hover:text-emerald-700"
          >
            {game.name}
          </Link>
          <p className="mt-1 text-sm font-medium text-slate-600">Host: {game.hostName}</p>
        </div>
        <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
          {bucketLabels[game.bucket]}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm font-medium text-slate-600 sm:grid-cols-2">
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-emerald-600" />
          {formatDate(game.gameDate)}
        </span>
        <span className="inline-flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-600" />
          {game.gameTime ? game.gameTime.slice(0, 5) : 'Cả ngày'}
        </span>
        <span className="inline-flex items-center gap-2 sm:col-span-2">
          <MapPin className="h-4 w-4 text-emerald-600" />
          {game.locationName || 'Chưa có địa điểm'}
        </span>
        <span className="inline-flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-600" />
          {game.activeParticipantCount} người tham gia
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href={getBadmintonGameManagementPath(game.id)}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Quản lý
        </Link>
        <Link
          href={publicPath}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ExternalLink className="h-4 w-4" />
          Link công khai
        </Link>
      </div>
    </article>
  );
}

interface CreateGameFormProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateGameForm({ onClose, onCreated }: CreateGameFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<CreateBadmintonGameData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  function updateForm<Key extends keyof CreateBadmintonGameData>(
    key: Key,
    value: CreateBadmintonGameData[Key],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.gameDate) {
      toast.error('Vui lòng chọn ngày chơi.', { id: 'badminton-create-date-error' });
      return;
    }

    try {
      setIsSaving(true);
      const result = await createBadmintonGame(form);
      toast.success('Đã tạo kèo cầu lông.', { id: 'badminton-create-success' });
      onCreated();
      router.push(result.managementPath);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo kèo cầu lông.', {
        id: 'badminton-create-error',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-950">Tạo kèo cầu lông</h2>
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
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-slate-700">
            Tên kèo tuỳ chọn
          </span>
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

export default function BadmintonFeaturePage() {
  const [games, setGames] = useState<BadmintonGameSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const groupedGames = useMemo(() => groupGames(games), [games]);

  const loadGames = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const nextGames = await listMyBadmintonGames();
      setGames(nextGames);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Không thể tải danh sách kèo cầu lông.',
      );
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
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950"
            >
              Tính năng
            </Link>
            <h1 className="text-2xl font-black tracking-normal text-slate-950">Cầu lông</h1>
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

      <section className="grid gap-5 lg:grid-cols-3">
        {(Object.keys(bucketLabels) as BadmintonGameBucket[]).map((bucket) => (
          <div key={bucket} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-950">{bucketLabels[bucket]}</h2>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                {groupedGames[bucket].length}
              </span>
            </div>

            {isLoading ? (
              <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-500">
                Đang tải...
              </p>
            ) : error ? (
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
      </section>
    </div>
  );
}
