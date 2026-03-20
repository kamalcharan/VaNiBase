/**
 * Dashboard 3-Row Layout
 * Row 1: KPI cards (hero stats)
 * Row 2: Main charts / tables
 * Row 3: Secondary content
 */

import type { ReactNode } from 'react';

interface Props { children: ReactNode[] }

export default function Dashboard3Row({ children }: Props) {
  const [row1, row2, row3, ...rest] = children;
  return (
    <div className="space-y-4">
      {row1 && <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{row1}</div>}
      {row2 && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{row2}</div>}
      {row3 && <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{row3}</div>}
      {rest.length > 0 && <div className="space-y-4">{rest}</div>}
    </div>
  );
}
