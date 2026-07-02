import { APP_ROUTES } from '@/constants/routes';
import { getFullName } from '@/features/profile/lib/profileUtils';
import OrganizationProfileSection from '@/features/profile/components/sections/OrganizationProfileSection';
import type { UserSummaryDto } from '@/features/users/types';
import Avatar from '@/shared/layout/Avatar';
import Link from 'next/link';

interface PublicUserProfilePageProps {
  user: UserSummaryDto;
  isSelf: boolean;
}

export default function PublicUserProfilePage({ user, isSelf }: PublicUserProfilePageProps) {
  const fullName = getFullName(user.lastName, user.middleName, user.firstName);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar src={user.avatarUrl} size="lg" alt={fullName} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-indigo-700">@{user.username}</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-950">{fullName || '-'}</h1>
              {user.nickname ? (
                <p className="mt-1 text-base font-medium text-gray-600">{user.nickname}</p>
              ) : null}
            </div>
          </div>

          {isSelf ? (
            <div className="mt-5 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-800">
              Bạn đang xem hồ sơ công khai nội bộ của mình. Trang{' '}
              <Link href={APP_ROUTES.profile} className="font-bold underline">
                Hồ sơ cá nhân
              </Link>{' '}
              dùng để chỉnh sửa thông tin.
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PublicProfileField label="Họ và tên" value={fullName} />
            <PublicProfileField label="Nickname" value={user.nickname} />
            <PublicProfileField label="Trường" value={user.schoolName} />
            <PublicProfileField label="Khóa" value={user.cohort} />
            <PublicProfileField label="Năm vào Đội" value={user.enterYear} />
            <PublicProfileField label="Giới tính" value={getPublicGenderLabel(user.gender)} />
            <OrganizationProfileSection profile={user.organizationProfile} />
          </div>
        </section>
      </div>
    </main>
  );
}

function PublicProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value.trim() || '-'}</p>
    </div>
  );
}

function getPublicGenderLabel(gender: 0 | 1 | null) {
  if (gender === 0) {
    return 'Nữ';
  }

  if (gender === 1) {
    return 'Nam';
  }

  return '-';
}
