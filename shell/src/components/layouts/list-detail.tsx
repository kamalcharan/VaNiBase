/**
 * List + Detail Layout
 * Left: narrow list panel (1/3)
 * Right: detail view (2/3)
 */

import type { ReactNode } from 'react';

interface Props { children: ReactNode[] }

export default function ListDetail({ children }: Props) {
  const [list, detail, ...rest] = children;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[60vh]">
      <div className="lg:col-span-1 overflow-y-auto border-r border-border pr-4 space-y-2">{list}</div>
      <div className="lg:col-span-2 space-y-4">{detail}{rest}</div>
    </div>
  );
}
