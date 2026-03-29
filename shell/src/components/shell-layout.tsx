'use client';

import type { ReactNode } from 'react';
import ShellSidebar from './shell-sidebar';
import ShellNavbar from './shell-navbar';

export function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <ShellSidebar />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <ShellNavbar />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            backgroundColor: 'var(--color-bg)',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
