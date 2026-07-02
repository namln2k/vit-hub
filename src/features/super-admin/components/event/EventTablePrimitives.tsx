import type { ReactNode } from 'react';

export function TableHeader({
  children,
  align = 'left',
  className = '',
}: {
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${className}`.trim()}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  align = 'left',
  className = '',
}: {
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td className={`px-4 py-4 ${align === 'right' ? 'text-right' : 'text-left'} ${className}`.trim()}>
      {children}
    </td>
  );
}
