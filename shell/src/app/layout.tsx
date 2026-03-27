import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import type { ShellConfig } from '../lib/shell-config-types';

/**
 * Product config — in submodule mode, webpack alias @product-config
 * resolves to the product's shell.config.ts. In standalone/dev mode,
 * falls back to the default config with no recipes.
 */
let productConfig: ShellConfig;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  productConfig = require('@product-config').default as ShellConfig;
} catch {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  productConfig = require('../lib/default-product-config').default as ShellConfig;
}

const productName = productConfig.product?.name || 'VaNi';
const productTagline = productConfig.product?.tagline || 'Product Framework';

export const metadata: Metadata = {
  title: productName,
  description: productTagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers config={productConfig}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
