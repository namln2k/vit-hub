import AdminContentPanel from './AdminContentPanel';
import type { AdminSection } from '@/features/super-admin/types';

interface PlaceholderManagementProps {
  section: AdminSection;
  description?: string;
  statusItems?: string[];
}

export default function PlaceholderManagement({
  section,
  description = 'Chưa có dữ liệu.',
  statusItems = [],
}: PlaceholderManagementProps) {
  return (
    <AdminContentPanel
      section={section}
      title={section.label}
      count={`0 ${section.countLabel}`}
    >
      <div className="space-y-4 px-5 py-8">
        <p className="text-sm font-medium text-slate-600">{description}</p>
        {statusItems.length > 0 ? (
          <ul className="divide-y divide-slate-200 border-y border-slate-200 text-sm">
            {statusItems.map((item) => (
              <li key={item} className="flex gap-3 py-3">
                <span className="shrink-0 font-semibold text-slate-500">Trạng thái</span>
                <span className="font-semibold text-slate-800">{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </AdminContentPanel>
  );
}
