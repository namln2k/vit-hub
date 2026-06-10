'use client';

import { ArrowRight, LayoutGrid, LogIn, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { APP_ROUTES } from '@/constants/routes';
import { useAuth } from '@/contexts/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import AvatarMenu from '@/shared/layout/AvatarMenu';
import UserSearch from '@/shared/layout/UserSearch';
import { getAllowedAvatarMenuFeatures, type AvatarMenuFeatureId } from '@/constants/avatarMenuAcl';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

const DEV_HUB_URL = 'https://vit-task.ezlisten.io.vn/boards/1793816112392045573';

const avatarMenuIcons: Record<AvatarMenuFeatureId, ReactNode> = {
  admin: <ShieldCheck className="h-4 w-4" />,
  features: <LayoutGrid className="h-4 w-4" />,
  profile: <UserRound className="h-4 w-4" />,
};

export default function Header() {
  const { currentUser, appUser, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    try {
      await signOut();
      router.push(APP_ROUTES.login);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể đăng xuất.', {
        id: 'sign-out-error',
      });
    }
  }

  const fullName = appUser
    ? `${appUser.lastName} ${appUser.middleName} ${appUser.firstName}`.trim()
    : currentUser?.email || '';
  const avatarItems = [
    ...getAllowedAvatarMenuFeatures(appUser?.role, pathname).map((feature) => ({
      label: feature.label,
      icon: avatarMenuIcons[feature.id],
      to: feature.to,
    })),
    {
      label: 'Đăng xuất',
      icon: <LogOut className="h-4 w-4" />,
      onClick: handleSignOut,
      danger: true,
    },
  ];

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(APP_ROUTES.home)}
            className="flex cursor-pointer items-center gap-2 text-xl font-bold text-indigo-600"
          >
            VIT Hub
          </button>

          <div className="mx-auto w-full max-w-md">
            <UserSearch />
          </div>

          {currentUser ? (
            <div className="flex items-center gap-4">
              {appUser?.role === 'super_admin' && (
                <Link
                  href={DEV_HUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-lg border border-sky-500 px-3 text-sm font-semibold text-sky-600 transition-colors hover:text-white"
                  aria-label="Dev Hub"
                >
                  <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 ease-out" />
                  <span className="absolute inset-y-0 left-0 w-0 bg-sky-500 transition-all duration-300 ease-out group-hover:w-full" />
                  <span className="relative z-10">Dev Hub</span>
                </Link>
              )}
              <AvatarMenu
                avatarSrc={appUser?.avatarUrl}
                label={fullName}
                buttonClassName="flex items-center gap-2 text-gray-700 cursor-pointer"
                items={avatarItems}
              >
                <span className="text-sm font-medium">{fullName}</span>
              </AvatarMenu>
            </div>
          ) : (
            <Link
              href={APP_ROUTES.login}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <LogIn className="h-4 w-4" />
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
