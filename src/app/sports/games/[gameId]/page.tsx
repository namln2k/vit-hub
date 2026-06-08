import { CalendarDays, Clock, Link as LinkIcon, MapPin, Share2, Users } from 'lucide-react';
import { getPublicSportGame } from '@/features/sports/server/sportRepository';
import { getSportTypeLabel } from '@/features/sports/sportTypes';
import { SPORT_TYPE_ICONS, SPORT_TYPE_THEMES } from '@/features/sports/sportTypeUi';
import PublicSportGameActions from '@/features/sports/components/PublicSportGameActions';
import { notFound } from 'next/navigation';

interface PublicSportGameRouteProps {
  params: Promise<{
    gameId: string;
  }>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(`${value}T00:00:00+07:00`));
}

export default async function PublicSportGameRoute({ params }: PublicSportGameRouteProps) {
  const { gameId } = await params;
  const game = await getPublicSportGame(gameId);

  if (!game) {
    notFound();
  }

  const theme = SPORT_TYPE_THEMES[game.type];
  const sportIcon = SPORT_TYPE_ICONS[game.type];
  const sportLabel = getSportTypeLabel(game.type);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <Share2 className="h-3.5 w-3.5" />
                Link chia sẻ công khai
              </div>
              <h1 className="wrap-break-word text-2xl font-black tracking-normal text-slate-950 sm:text-3xl">
                {game.name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${theme.badge}`}
                >
                  <img src={sportIcon.src} alt="" className="h-4 w-4" />
                  {sportLabel}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">
                  Host: {game.hostName}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              {game.isExpired ? 'Đã kết thúc' : 'Đang mở tham gia'}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <CalendarDays className={`h-5 w-5 ${theme.icon}`} />
              <p className="mt-2 text-xs font-semibold uppercase text-slate-500">Ngày</p>
              <p className="mt-1 text-sm font-bold text-slate-950">{formatDate(game.gameDate)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <Clock className={`h-5 w-5 ${theme.icon}`} />
              <p className="mt-2 text-xs font-semibold uppercase text-slate-500">Giờ</p>
              <p className="mt-1 text-sm font-bold text-slate-950">
                {game.gameTime ? game.gameTime.slice(0, 5) : 'Cả ngày'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4 sm:col-span-2">
              <MapPin className={`h-5 w-5 ${theme.icon}`} />
              <p className="mt-2 text-xs font-semibold uppercase text-slate-500">Địa điểm</p>
              <p className="mt-1 text-sm font-bold text-slate-950">
                {game.locationName || 'Chưa có địa điểm'}
              </p>
              {game.locationUrl ? (
                <a
                  href={game.locationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`mt-2 inline-flex items-center gap-1 text-sm font-semibold ${theme.icon} ${theme.hover}`}
                >
                  <LinkIcon className="h-4 w-4" />
                  Mở link địa điểm
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
              <Users className={`h-5 w-5 ${theme.icon}`} />
              Người tham gia
            </h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
              {game.participants.length}
            </span>
          </div>

          {game.participants.length > 0 ? (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {game.participants.map((participant) => (
                <li
                  key={participant.id}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
                >
                  {participant.name}
                  {participant.role === 'host' ? (
                    <span className="ml-2 text-xs font-bold text-emerald-700">Host</span>
                  ) : participant.role === 'co_host' ? (
                    <span className="ml-2 text-xs font-bold text-sky-700">Co-host</span>
                  ) : participant.isGuest ? (
                    <span className="ml-2 text-xs font-bold text-slate-500">Khách</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm font-medium text-slate-500">Chưa có người tham gia.</p>
          )}
        </section>

        <section className="mt-5">
          <PublicSportGameActions gameId={game.id} isExpired={game.isExpired} />
        </section>
      </div>
    </main>
  );
}
