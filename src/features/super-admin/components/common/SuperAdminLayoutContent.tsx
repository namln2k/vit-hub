'use client';

import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { ADMIN_SECTIONS } from '@/features/super-admin/constants/adminSections';
import {
  SuperAdminLayoutProvider,
  useSuperAdminLayout,
} from '@/features/super-admin/contexts/SuperAdminLayoutContext';
import SuperAdminSidebar from './SuperAdminSidebar';

export default function SuperAdminLayoutContent({ children }: { children: ReactNode }) {
  return (
    <SuperAdminLayoutProvider>
      <SuperAdminLayoutShell>{children}</SuperAdminLayoutShell>
    </SuperAdminLayoutProvider>
  );
}

function SuperAdminLayoutShell({ children }: { children: ReactNode }) {
  const {
    activeSectionId,
    divisions,
    isLoadingDivisions,
    divisionError,
    groups,
    isLoadingGroups,
    groupError,
    activeDivision,
    activeGroup,
    clubs,
    isLoadingClubs,
    clubError,
    activeClub,
  } = useSuperAdminLayout();

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
              <ShieldCheck className="h-4 w-4" />
              Super Admin
            </div>
            <h1 className="text-2xl font-bold text-slate-950">Bảng quản trị</h1>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <SuperAdminSidebar
            sections={ADMIN_SECTIONS}
            activeSectionId={activeSectionId}
            divisions={divisions}
            activeDivisionId={activeDivision?.id ?? ''}
            isLoadingDivisions={isLoadingDivisions}
            divisionError={divisionError}
            groups={groups}
            activeGroupId={activeGroup?.id ?? ''}
            isLoadingGroups={isLoadingGroups}
            groupError={groupError}
            clubs={clubs}
            activeClubId={activeClub?.id ?? ''}
            isLoadingClubs={isLoadingClubs}
            clubError={clubError}
          />

          {children}
        </div>
      </main>
    </div>
  );
}
