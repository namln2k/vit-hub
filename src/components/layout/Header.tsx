import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { useNavigate } from 'react-router-dom';
import AvatarMenu from '@/components/layout/AvatarMenu';

export default function Header() {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const fullName = userProfile
    ? `${userProfile.lastName} ${userProfile.middleName} ${userProfile.firstName}`.trim()
    : 'Người dùng';

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xl font-bold text-indigo-600 cursor-pointer"
          >
            VIT Hub
          </button>

          <div className="flex items-center gap-4">
            <AvatarMenu
              avatarSrc={userProfile?.avatarUrl}
              label={fullName}
              buttonClassName="flex items-center gap-2 text-gray-700 cursor-pointer"
              items={[
                {
                  label: 'Đăng xuất',
                  icon: <LogOut className="h-4 w-4" />,
                  onClick: handleSignOut,
                  danger: true,
                },
              ]}
            >
              <span className="text-sm font-medium">
                {fullName}
              </span>
            </AvatarMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
