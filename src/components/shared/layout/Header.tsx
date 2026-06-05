'use client';

import { LayoutGrid, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import AvatarMenu from '@/components/shared/layout/AvatarMenu';
import UserSearch from '@/components/shared/layout/UserSearch';
import {
  getAllowedAvatarMenuFeatures,
  type AvatarMenuFeatureId,
} from '@/constants/avatarMenuAcl';
import type { ReactNode } from 'react';

const avatarMenuIcons: Record<AvatarMenuFeatureId, ReactNode> = {
  admin: <ShieldCheck className="h-4 w-4" />,
  features: <LayoutGrid className="h-4 w-4" />,
  profile: <UserRound className="h-4 w-4" />,
};

export default function Header() {
  const { appUser, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  const fullName = appUser
    ? `${appUser.lastName} ${appUser.middleName} ${appUser.firstName}`.trim()
    : 'Người dùng';
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
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-xl font-bold text-indigo-600 cursor-pointer"
          >
            VIT Hub
          </button>

          <div className="mx-auto w-full max-w-md">
            <UserSearch />
          </div>

          <div className="flex items-center gap-4">
            <AvatarMenu
              avatarSrc={appUser?.avatarUrl}
              label={fullName}
              buttonClassName="flex items-center gap-2 text-gray-700 cursor-pointer"
              items={avatarItems}
            >
              <span className="text-sm font-medium">{fullName}</span>
            </AvatarMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
