import { ChevronRight, Loader2 } from 'lucide-react';
import type { Division } from '@/api/divisions';
import type { AdminSection, AdminSectionId } from './types';

interface SuperAdminSidebarProps {
  sections: AdminSection[];
  activeSectionId: AdminSectionId;
  onSectionChange: (sectionId: AdminSectionId) => void;
  divisions: Division[];
  activeDivisionId: string;
  onDivisionChange: (divisionId: string) => void;
  isLoadingDivisions: boolean;
  divisionError: string;
}

export default function SuperAdminSidebar({
  sections,
  activeSectionId,
  onSectionChange,
  divisions,
  activeDivisionId,
  onDivisionChange,
  isLoadingDivisions,
  divisionError,
}: SuperAdminSidebarProps) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
      <nav className="space-y-1" aria-label="Super admin">
        {sections.map((section) => {
          const isActive = section.id === activeSectionId;

          return (
            <div key={section.id}>
              <button
                type="button"
                onClick={() => onSectionChange(section.id)}
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
                {section.id === 'divisions' && (
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${isActive ? 'rotate-90' : ''}`}
                  />
                )}
              </button>

              {section.id === 'divisions' && isActive && (
                <DivisionNavItems
                  divisions={divisions}
                  activeDivisionId={activeDivisionId}
                  onDivisionChange={onDivisionChange}
                  isLoadingDivisions={isLoadingDivisions}
                  divisionError={divisionError}
                />
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

interface DivisionNavItemsProps {
  divisions: Division[];
  activeDivisionId: string;
  onDivisionChange: (divisionId: string) => void;
  isLoadingDivisions: boolean;
  divisionError: string;
}

function DivisionNavItems({
  divisions,
  activeDivisionId,
  onDivisionChange,
  isLoadingDivisions,
  divisionError,
}: DivisionNavItemsProps) {
  if (isLoadingDivisions) {
    return (
      <div className="mt-1 flex items-center gap-2 px-7 py-2 text-sm font-medium text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải mảng
      </div>
    );
  }

  if (divisionError) {
    return <p className="mt-1 px-7 py-2 text-sm font-medium text-red-600">{divisionError}</p>;
  }

  if (divisions.length === 0) {
    return <p className="mt-1 px-7 py-2 text-sm font-medium text-slate-500">Chưa có mảng.</p>;
  }

  return (
    <div className="mt-1 space-y-1 pl-4">
      {divisions.map((division) => {
        const isDivisionActive = division.id === activeDivisionId;

        return (
          <button
            key={division.id}
            type="button"
            onClick={() => onDivisionChange(division.id)}
            className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors ${
              isDivisionActive
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            }`}
          >
            <span className="truncate">{division.name}</span>
          </button>
        );
      })}
    </div>
  );
}
