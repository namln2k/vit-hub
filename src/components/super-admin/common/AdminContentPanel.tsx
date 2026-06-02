import type { ReactNode } from 'react';
import type { AdminSection } from './types';

interface AdminContentPanelProps {
  section: AdminSection;
  title: ReactNode;
  count: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function AdminContentPanel({
  section,
  title,
  count,
  actions,
  children,
}: AdminContentPanelProps) {
  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold text-slate-950">
              {title}
            </h2>
            <div
              className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${section.accentClassName}`}
            >
              {count}
            </div>
          </div>

          {actions ? <div className="flex flex-col gap-2 sm:flex-row">{actions}</div> : null}
        </div>
      </div>

      {children}
    </section>
  );
}
