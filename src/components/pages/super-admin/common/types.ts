import type { ReactNode } from 'react';

export type AdminSectionId = 'divisions' | 'groups' | 'users' | 'fund';

export interface AdminSection {
  id: AdminSectionId;
  label: string;
  icon: ReactNode;
  countLabel: string;
  accentClassName: string;
}
