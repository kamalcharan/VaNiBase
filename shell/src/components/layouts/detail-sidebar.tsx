/**
 * Detail + Sidebar Layout
 * Left: main content (2/3 width)
 * Right: sidebar (1/3 width)
 */

import type { ReactNode } from 'react';

interface Props { children: ReactNode[] }

export default function DetailSidebar({ children }: Props) {
  const [main, sidebar, ...rest] = children;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">{main}{rest}</div>
      <div className="space-y-4">{sidebar}</div>
    </div>
  );
}
