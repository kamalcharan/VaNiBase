'use client';

import { useTheme } from './theme-provider';

export default function Header() {
  const { colorMode, toggleColorMode } = useTheme();

  return (
    <header className="sticky top-0 z-10 h-14 bg-surface border-b border-border flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-3">
        {/* Light / Dark toggle */}
        <button
          onClick={toggleColorMode}
          className="p-2 rounded-md hover:bg-surface-hover text-muted transition-colors"
          aria-label="Toggle color mode"
        >
          {colorMode === 'light' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
