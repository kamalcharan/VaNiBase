'use client';

import type { ReactNode } from 'react';
import { ShellConfigProvider } from '../lib/shell-config';
import { AuthProvider } from '../context/auth-provider';
import { ThemeProvider } from '../components/theme-provider';

/**
 * Provider nesting order (critical):
 *   ShellConfigProvider → AuthProvider → ThemeProvider → Product providers[]
 *
 * Config is loaded client-side via require() to preserve non-serializable
 * values (e.g., pages.login component references, provider components) that
 * would be stripped at the Server Component → Client Component serialization boundary.
 */
let productConfig: import('../lib/shell-config').ShellConfig;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  productConfig = require('@product-config').default;
} catch {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  productConfig = require('../lib/default-product-config').default;
}

export function Providers({ children }: { children: ReactNode }) {
  // Wrap children with product-level providers (first in array = outermost)
  const productProviders = productConfig.providers ?? [];
  const wrapped = productProviders.reduceRight(
    (acc: ReactNode, Provider: React.ComponentType<{ children: ReactNode }>) => (
      <Provider>{acc}</Provider>
    ),
    children,
  );

  return (
    <ShellConfigProvider config={productConfig}>
      <AuthProvider>
        <ThemeProvider>
          {wrapped}
        </ThemeProvider>
      </AuthProvider>
    </ShellConfigProvider>
  );
}
