'use client';

import Header from '@/shared/layout/Header';
import { ADMIN_SECTIONS } from '@/features/super-admin/constants/adminSections';
import PlaceholderManagement from '@/features/super-admin/components/common/PlaceholderManagement';
import type { AdminSectionId } from '@/features/super-admin/types';
import DivisionsManagement from '@/features/super-admin/components/division/DivisionsManagement';
import GroupsManagement from '@/features/super-admin/components/group/GroupsManagement';
import PostsManagement from '@/features/super-admin/components/post/PostsManagement';
import UsersManagement from '@/features/super-admin/components/user/UsersManagement';
import SuperAdminSidebar from '@/features/super-admin/components/common/SuperAdminSidebar';
import { useSuperAdminNavigationData } from '@/features/super-admin/hooks/useSuperAdminNavigationData';
import { ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';

export default function SuperAdminPage() {
  const routeParams = useParams();
  const rawSegments = routeParams.segments;
  const routeSegments = Array.isArray(rawSegments)
    ? rawSegments
    : typeof rawSegments === 'string'
      ? [rawSegments]
      : [];
  const sectionIdFromUrl = routeSegments[0] as AdminSectionId | undefined;
  const activeSectionId: AdminSectionId =
    sectionIdFromUrl && ADMIN_SECTIONS.some((section) => section.id === sectionIdFromUrl)
      ? sectionIdFromUrl
      : 'divisions';
  const activeItemSlug = routeSegments[1];
  const {
    divisions,
    isLoadingDivisions,
    divisionError,
    groups,
    isLoadingGroups,
    groupError,
    activeDivision,
    activeGroup,
    handleGroupCreated,
    handleGroupUpdated,
    handleGroupDeleted,
  } = useSuperAdminNavigationData({ activeSectionId, activeItemSlug });

  const activeSection = useMemo(
    () => ADMIN_SECTIONS.find((section) => section.id === activeSectionId) ?? ADMIN_SECTIONS[0],
    [activeSectionId],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
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
          />

          {activeSectionId === 'divisions' ? (
            <DivisionsManagement
              activeDivision={activeDivision}
              divisions={divisions}
              isLoadingDivisions={isLoadingDivisions}
              divisionError={divisionError}
            />
          ) : activeSectionId === 'groups' ? (
            <GroupsManagement
              activeGroup={activeGroup}
              groups={groups}
              isLoadingGroups={isLoadingGroups}
              groupError={groupError}
              onGroupCreated={handleGroupCreated}
              onGroupUpdated={handleGroupUpdated}
              onGroupDeleted={handleGroupDeleted}
            />
          ) : activeSectionId === 'users' ? (
            <UsersManagement />
          ) : activeSectionId === 'posts' ? (
            <PostsManagement />
          ) : (
            <PlaceholderManagement section={activeSection} />
          )}
        </div>
      </main>
    </div>
  );
}
