/**
 * Wizard Flow Layout
 * Centered, narrow container for step-by-step wizards.
 */

import type { ReactNode } from 'react';

interface Props { children: ReactNode[] }

export default function WizardFlow({ children }: Props) {
  return (
    <div className="max-w-xl mx-auto space-y-4">
      {children.map((child, i) => (
        <div key={i}>{child}</div>
      ))}
    </div>
  );
}
