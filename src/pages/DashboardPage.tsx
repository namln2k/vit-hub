import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { userProfile } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Thông tin tài khoản</h2>

          {userProfile && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Họ và tên</p>
                <p className="font-medium text-gray-900">
                  {`${userProfile.lastName} ${userProfile.middleName} ${userProfile.firstName}`.trim()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Username</p>
                <p className="font-medium text-gray-900">@{userProfile.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{userProfile.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vai trò</p>
                <p className="font-medium text-gray-900 capitalize">{userProfile.role}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-gray-500 mb-1">Trạng thái</p>
                {userProfile.status === 'pending' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    <Clock className="w-3.5 h-3.5" />
                    Chờ kích hoạt
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Đã kích hoạt
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
