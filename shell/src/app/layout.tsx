import type { Metadata } from 'next';
import './globals.css';
import { ShellLayout } from '../components/shell-layout';
import { ShellConfigProvider } from '../lib/shell-config';
import productConfig from '@product-config';

export const metadata: Metadata = {
  title: productConfig?.product?.name || 'VaNi',
  description: productConfig?.product?.tagline || 'VaNi Product Framework',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="ocean-blue">
      <body className="antialiased">
        <ShellConfigProvider config={productConfig}>
          <ShellLayout>{children}</ShellLayout>
        </ShellConfigProvider>
      </body>
    </html>
  );
}