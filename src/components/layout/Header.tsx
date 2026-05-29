import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { useNavigate } from 'react-router-dom';
import defaultAvatar from '@/assets/default-avatar.png';

export default function Header() {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

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
            <div className="flex items-center gap-2 text-gray-700">
              <img
                src={userProfile?.avatarUrl || defaultAvatar}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
              />
              <span className="text-sm font-medium">
                {userProfile
                  ? `${userProfile.lastName} ${userProfile.middleName} ${userProfile.firstName}`.trim()
                  : 'Người dùng'}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
