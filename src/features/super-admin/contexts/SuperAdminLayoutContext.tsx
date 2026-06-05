'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSelectedLayoutSegments } from 'next/navigation';
import { ADMIN_SECTIONS } from '@/features/super-admin/constants/adminSections';
import { useSuperAdminNavigationData } from '@/features/super-admin/hooks/useSuperAdminNavigationData';
import type { AdminSection, AdminSectionId } from '@/features/super-admin/types';

type SuperAdminNavigationData = ReturnType<typeof useSuperAdminNavigationData>;

interface SuperAdminLayoutContextValue extends SuperAdminNavigationData {
  activeSection: AdminSection;
  activeSectionId: AdminSectionId;
  activeItemSlug: string | undefined;
}

const SuperAdminLayoutContext = createContext<SuperAdminLayoutContextValue | null>(null);

export function SuperAdminLayoutProvider({ children }: { children: ReactNode }) {
  const routeSegments = useSelectedLayoutSegments();
  const sectionIdFromUrl = routeSegments[0] as AdminSectionId | undefined;
  const activeSectionId: AdminSectionId =
    sectionIdFromUrl && ADMIN_SECTIONS.some((section) => section.id === sectionIdFromUrl)
      ? sectionIdFromUrl
      : 'divisions';
  const activeItemSlug = routeSegments[1];
  const navigationData = useSuperAdminNavigationData({ activeSectionId, activeItemSlug });

  const activeSection = useMemo(
    () => ADMIN_SECTIONS.find((section) => section.id === activeSectionId) ?? ADMIN_SECTIONS[0],
    [activeSectionId],
  );
  const value = useMemo(
    () => ({
      activeSection,
      activeSectionId,
      activeItemSlug,
      ...navigationData,
    }),
    [activeItemSlug, activeSection, activeSectionId, navigationData],
  );

  return (
    <SuperAdminLayoutContext.Provider value={value}>
      {children}
    </SuperAdminLayoutContext.Provider>
  );
}

export function useSuperAdminLayout() {
  const context = useContext(SuperAdminLayoutContext);

  if (!context) {
    throw new Error('useSuperAdminLayout must be used within SuperAdminLayoutProvider');
  }

  return context;
}
