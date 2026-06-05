'use client';

import Header from '@/components/shared/layout/Header';
import ProfileAccountCard from '@/components/pages/profile/sections/ProfileAccountCard';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Hồ sơ cá nhân</h1>
        <ProfileAccountCard />
      </main>
    </div>
  );
}
