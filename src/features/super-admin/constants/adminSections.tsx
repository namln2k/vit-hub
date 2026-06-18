import {
  BadgeCheck,
  Banknote,
  Building2,
  CalendarDays,
  KeyRound,
  Network,
  Newspaper,
  UserCog,
  UsersRound,
} from 'lucide-react';
import type { AdminSection } from '@/features/super-admin/types';

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    id: 'divisions',
    label: 'Quản lý mảng',
    icon: <Building2 className="h-4 w-4" />,
    countLabel: 'mảng',
    accentClassName: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'groups',
    label: 'Quản lý nhóm',
    icon: <UsersRound className="h-4 w-4" />,
    countLabel: 'nhóm',
    accentClassName: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'clubs',
    label: 'Quản lý CLB/tổ',
    icon: <Network className="h-4 w-4" />,
    countLabel: 'CLB/tổ',
    accentClassName: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  {
    id: 'events',
    label: 'Quản lý sự kiện',
    icon: <CalendarDays className="h-4 w-4" />,
    countLabel: 'sự kiện',
    accentClassName: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    id: 'organization-roles',
    label: 'Chức vụ Đội',
    icon: <BadgeCheck className="h-4 w-4" />,
    countLabel: 'chức vụ',
    accentClassName: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    id: 'users',
    label: 'Quản lý nhân sự',
    icon: <UserCog className="h-4 w-4" />,
    countLabel: 'nhân sự',
    accentClassName: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    id: 'posts',
    label: 'Quản lý bài đăng',
    icon: <Newspaper className="h-4 w-4" />,
    countLabel: 'bài viết',
    accentClassName: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  {
    id: 'permissions',
    label: 'Phân quyền',
    icon: <KeyRound className="h-4 w-4" />,
    countLabel: 'grants',
    accentClassName: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    id: 'fund',
    label: 'Quản lý quỹ Đội',
    icon: <Banknote className="h-4 w-4" />,
    countLabel: 'giao dịch',
    accentClassName: 'bg-amber-50 text-amber-700 border-amber-200',
  },
];
