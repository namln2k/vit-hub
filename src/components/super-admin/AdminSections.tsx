import { Banknote, Building2, UsersRound } from 'lucide-react';
import type { AdminSection } from './types';

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    id: 'divisions',
    label: 'Quản lý mảng',
    icon: <Building2 className="h-4 w-4" />,
    countLabel: 'mảng',
    accentClassName: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'teams',
    label: 'Quản lý nhóm',
    icon: <UsersRound className="h-4 w-4" />,
    countLabel: 'nhóm',
    accentClassName: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'fund',
    label: 'Quản lý quỹ Đội',
    icon: <Banknote className="h-4 w-4" />,
    countLabel: 'giao dịch',
    accentClassName: 'bg-amber-50 text-amber-700 border-amber-200',
  },
];
