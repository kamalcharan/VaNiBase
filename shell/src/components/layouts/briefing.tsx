/**
 * Briefing Layout
 * Single-column, content-first layout for daily briefings and reports.
 */

import type { ReactNode } from 'react';

interface Props { children: ReactNode[] }

export default function Briefing({ children }: Props) {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {children.map((child, i) => (
        <div key={i}>{child}</div>
      ))}
    </div>
  );
}
