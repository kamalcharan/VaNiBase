'use client';

import type { ReactNode } from 'react';
import { ShellConfigProvider, type ShellConfig } from '../lib/shell-config';
import { AuthProvider } from '../context/auth-provider';
import { ThemeProvider } from '../components/theme-provider';

/**
 * Provider nesting order (critical):
 *   ShellConfigProvider → AuthProvider → ThemeProvider
 *
 * ShellConfigProvider is outermost — AuthProvider may need apiUrl from config.
 * AuthProvider before ThemeProvider — tenant.theme_id sets initial theme after login.
 */
export function Providers({
  config,
  children,
}: {
  config: ShellConfig;
  children: ReactNode;
}) {
  return (
    <ShellConfigProvider config={config}>
      <AuthProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </AuthProvider>
    </ShellConfigProvider>
  );
}
