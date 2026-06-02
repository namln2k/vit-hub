import { ChevronRight, Loader2 } from 'lucide-react';
import type { Division } from '@/api/divisions';
import type { Group } from '@/api/groups';
import { getAdminItemPath, getAdminSectionPath } from '@/components/super-admin/common/adminRoutes';
import type { AdminSection, AdminSectionId } from '@/components/super-admin/common/types';
import { Link } from 'react-router-dom';

interface SuperAdminSidebarProps {
  sections: AdminSection[];
  activeSectionId: AdminSectionId;
  divisions: Division[];
  activeDivisionId: string;
  isLoadingDivisions: boolean;
  divisionError: string;
  groups: Group[];
  activeGroupId: string;
  isLoadingGroups: boolean;
  groupError: string;
}

export default function SuperAdminSidebar({
  sections,
  activeSectionId,
  divisions,
  activeDivisionId,
  isLoadingDivisions,
  divisionError,
  groups,
  activeGroupId,
  isLoadingGroups,
  groupError,
}: SuperAdminSidebarProps) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
      <nav className="space-y-1" aria-label="Super admin">
        {sections.map((section) => {
          const isActive = section.id === activeSectionId;

          return (
            <div key={section.id}>
              <Link
                to={getAdminSectionPath(section.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {section.icon}
                  <span className="truncate">{section.label}</span>
                </span>
                {(section.id === 'divisions' || section.id === 'groups') && (
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${isActive ? 'rotate-90' : ''}`}
                  />
                )}
              </Link>

              {section.id === 'divisions' && isActive && (
                <NestedNavItems
                  sectionId="divisions"
                  items={divisions}
                  activeItemId={activeDivisionId}
                  isLoading={isLoadingDivisions}
                  error={divisionError}
                  loadingLabel="Đang tải mảng"
                  emptyLabel="Chưa có mảng."
                  activeClassName="bg-indigo-50 text-indigo-700"
                />
              )}

              {section.id === 'groups' && isActive && (
                <NestedNavItems
                  sectionId="groups"
                  items={groups}
                  activeItemId={activeGroupId}
                  isLoading={isLoadingGroups}
                  error={groupError}
                  loadingLabel="Đang tải nhóm"
                  emptyLabel="Chưa có nhóm."
                  activeClassName="bg-emerald-50 text-emerald-700"
                />
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

interface NestedNavItem {
  id: string;
  name: string;
}

interface NestedNavItemsProps {
  sectionId: 'divisions' | 'groups';
  items: NestedNavItem[];
  activeItemId: string;
  isLoading: boolean;
  error: string;
  loadingLabel: string;
  emptyLabel: string;
  activeClassName: string;
}

function NestedNavItems({
  sectionId,
  items,
  activeItemId,
  isLoading,
  error,
  loadingLabel,
  emptyLabel,
  activeClassName,
}: NestedNavItemsProps) {
  if (isLoading) {
    return (
      <div className="mt-1 flex items-center gap-2 px-7 py-2 text-sm font-medium text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        {loadingLabel}
      </div>
    );
  }

  if (error) {
    return <p className="mt-1 px-7 py-2 text-sm font-medium text-red-600">{error}</p>;
  }

  if (items.length === 0) {
    return <p className="mt-1 px-7 py-2 text-sm font-medium text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="mt-1 space-y-1 pl-4">
      {items.map((item) => {
        const isItemActive = item.id === activeItemId;

        return (
          <Link
            key={item.id}
            to={getAdminItemPath(sectionId, item)}
            className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors ${
              isItemActive
                ? activeClassName
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            }`}
          >
            <span className="truncate">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
