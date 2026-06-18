import type { ReactNode } from 'react';

export type AdminSectionId =
  | 'divisions'
  | 'groups'
  | 'clubs'
  | 'events'
  | 'organization-roles'
  | 'users'
  | 'posts'
  | 'permissions'
  | 'fund';

export interface AdminSection {
  id: AdminSectionId;
  label: string;
  icon: ReactNode;
  countLabel: string;
  accentClassName: string;
}
