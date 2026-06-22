'use client';

import { APP_ROUTES, getPublicSportGamePath, withRouteQuery } from '@/constants/routes';
import { joinSportGame, joinSportGameAsGuest } from '@/services/sports';
import { LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { useRouter } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

interface PublicSportGameActionsProps {
  gameId: string;
  isExpired: boolean;
}

export default function PublicSportGameActions({ gameId, isExpired }: PublicSportGameActionsProps) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [isJoiningAccount, setIsJoiningAccount] = useState(false);
  const [isJoiningGuest, setIsJoiningGuest] = useState(false);

  async function handleAccountJoin() {
    try {
      setIsJoiningAccount(true);
      const result = await joinSportGame(gameId);
      toast.success('Đã tham gia kèo.', { id: 'sports-account-join-success' });
      router.push(result.managementPath);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tham gia kèo.', {
        id: 'sports-account-join-error',
      });
    } finally {
      setIsJoiningAccount(false);
    }
  }

  async function handleGuestJoin(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!guestName.trim()) {
      toast.error('Vui lòng nhập tên khách.', { id: 'sports-guest-name-error' });
      return;
    }

    try {
      setIsJoiningGuest(true);
      await joinSportGameAsGuest(gameId, guestName, guestContact);
      setGuestName('');
      setGuestContact('');
      toast.success('Đã thêm khách tham gia.', { id: 'sports-guest-join-success' });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thêm khách tham gia.', {
        id: 'sports-guest-join-error',
      });
    } finally {
      setIsJoiningGuest(false);
    }
  }

  if (isExpired) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-600">
        Kèo đã kết thúc. Danh sách tham gia hiện là danh sách cuối cùng.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="text-base font-bold text-emerald-950">Tham gia bằng tài khoản</h2>
        <p className="mt-1 text-sm leading-6 text-emerald-900">
          Thành viên đã đăng nhập sẽ được chuyển về trang quản lý kèo sau khi tham gia.
        </p>
        {loading ? (
          <button
            type="button"
            disabled
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-slate-300 px-4 text-sm font-semibold text-white"
          >
            Đang kiểm tra...
          </button>
        ) : currentUser ? (
          <button
            type="button"
            onClick={handleAccountJoin}
            disabled={isJoiningAccount}
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <UserPlus className="h-4 w-4" />
            {isJoiningAccount ? 'Đang tham gia...' : 'Tham gia'}
          </button>
        ) : (
          <Link
            href={withRouteQuery(APP_ROUTES.login, {
              next: getPublicSportGamePath(gameId),
            })}
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <LogIn className="h-4 w-4" />
            Đăng nhập để tham gia
          </Link>
        )}
      </div>

      <form onSubmit={handleGuestJoin} className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-bold text-slate-950">Tham gia dạng khách</h2>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Tên hiển thị</span>
            <input
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              disabled={isJoiningGuest}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="VD: Nam"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              SĐT/email tuỳ chọn
            </span>
            <input
              value={guestContact}
              onChange={(event) => setGuestContact(event.target.value)}
              disabled={isJoiningGuest}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="Thông tin liên hệ"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={isJoiningGuest}
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <UserPlus className="h-4 w-4" />
          {isJoiningGuest ? 'Đang thêm...' : 'Tham gia dạng khách'}
        </button>
      </form>
    </div>
  );
}
