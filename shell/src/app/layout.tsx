import type { Metadata } from 'next';
import './globals.css';
import { ShellLayout } from '../components/shell-layout';
import { ShellConfigProvider } from '../lib/shell-config';
import { DEFAULT_SHELL_CONFIG } from '../lib/shell-config-types';
import type { ShellConfig } from '../lib/shell-config-types';
import productConfig from '@product-config';

// Use product config if it looks valid, otherwise fall back to default
const config: ShellConfig =
  productConfig && typeof productConfig === 'object' && 'product' in productConfig
    ? (productConfig as ShellConfig)
    : DEFAULT_SHELL_CONFIG;

export const metadata: Metadata = {
  title: config.product.name,
  description: config.product.tagline ?? 'VaNi Product Framework',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="ocean-blue">
      <body className="antialiased">
        <ShellConfigProvider config={config}>
          <ShellLayout>{children}</ShellLayout>
        </ShellConfigProvider>
      </body>
    </html>
  );
}
