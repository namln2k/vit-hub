import type { Division } from '@/services/divisions';

interface DivisionsTableProps {
  divisions: Division[];
  isLoading: boolean;
  error: string;
}

export default function DivisionsTable({ divisions, isLoading, error }: DivisionsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Tên mảng
            </th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Mô tả
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {isLoading ? (
            <EmptyTableRow colSpan={2}>Đang tải mảng...</EmptyTableRow>
          ) : error ? (
            <EmptyTableRow className="text-red-600" colSpan={2}>
              {error}
            </EmptyTableRow>
          ) : divisions.length > 0 ? (
            divisions.map((division) => (
              <tr
                key={division.id}
                className={`hover:bg-slate-50 ${division.archivedAt ? 'bg-slate-50/70 text-slate-500' : ''}`}
              >
                <td className="px-5 py-4 text-sm font-semibold text-slate-950">
                  {division.name}
                  {division.archivedAt ? (
                    <span className="ml-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      Đã lưu trữ
                    </span>
                  ) : null}
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {division.description || 'Chưa có mô tả'}
                </td>
              </tr>
            ))
          ) : (
            <EmptyTableRow colSpan={2}>Chưa có mảng.</EmptyTableRow>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface EmptyTableRowProps {
  children: string;
  className?: string;
  colSpan: number;
}

function EmptyTableRow({ children, className = 'text-slate-500', colSpan }: EmptyTableRowProps) {
  return (
    <tr>
      <td className={`px-5 py-10 text-center text-sm font-medium ${className}`} colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}
