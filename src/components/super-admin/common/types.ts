import type { ReactNode } from 'react';

export type AdminSectionId = 'divisions' | 'groups' | 'fund';

export interface AdminSection {
  id: AdminSectionId;
  label: string;
  icon: ReactNode;
  countLabel: string;
  accentClassName: string;
}
