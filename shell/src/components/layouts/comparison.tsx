/**
 * Comparison Layout
 * Side-by-side columns for comparing entities, plans, or scenarios.
 */

import type { ReactNode } from 'react';

interface Props { children: ReactNode[] }

export default function Comparison({ children }: Props) {
  const cols = children.length || 1;
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${Math.min(cols, 4)}, minmax(0, 1fr))` }}
    >
      {children.map((child, i) => (
        <div key={i} className="space-y-4">{child}</div>
      ))}
    </div>
  );
}
