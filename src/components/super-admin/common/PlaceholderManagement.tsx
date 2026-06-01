import AdminContentPanel from './AdminContentPanel';
import type { AdminSection } from './types';

interface PlaceholderManagementProps {
  section: AdminSection;
}

export default function PlaceholderManagement({ section }: PlaceholderManagementProps) {
  return (
    <AdminContentPanel
      section={section}
      title={section.label}
      count={`0 ${section.countLabel}`}
    >
      <div className="px-5 py-10 text-center text-sm font-medium text-slate-500">
        Chưa có dữ liệu.
      </div>
    </AdminContentPanel>
  );
}
