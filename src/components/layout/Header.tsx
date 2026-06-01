import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { useNavigate } from 'react-router-dom';
import AvatarMenu from '@/components/layout/AvatarMenu';
import UserSearch from '@/components/layout/UserSearch';

export default function Header() {
  const { appUser, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const fullName = appUser
    ? `${appUser.lastName} ${appUser.middleName} ${appUser.firstName}`.trim()
    : 'Người dùng';
  const avatarItems = [
    ...(appUser?.role === 'super_admin'
      ? [
          {
            label: 'Quản trị',
            icon: <ShieldCheck className="h-4 w-4" />,
            to: '/super-admin',
          },
        ]
      : []),
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
            onClick={() => navigate('/')}
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
