'use client';

import type { ReactNode } from 'react';
import { ShellConfigProvider } from '../lib/shell-config';
import { AuthProvider } from '../context/auth-provider';
import { ThemeProvider } from '../components/theme-provider';

/**
 * Provider nesting order (critical):
 *   ShellConfigProvider → AuthProvider → ThemeProvider
 *
 * Config is loaded client-side via require() to preserve non-serializable
 * values (e.g., pages.login component references) that would be stripped
 * at the Server Component → Client Component serialization boundary.
 */
let productConfig;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  productConfig = require('@product-config').default;
} catch {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  productConfig = require('../lib/default-product-config').default;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ShellConfigProvider config={productConfig}>
      <AuthProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </AuthProvider>
    </ShellConfigProvider>
  );
}
