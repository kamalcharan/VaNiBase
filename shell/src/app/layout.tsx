import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

// Extract only serializable metadata for SSR
let productName = 'VaNi';
let productTagline = 'Product Framework';
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cfg = require('@product-config').default;
  productName = cfg.product?.name || productName;
  productTagline = cfg.product?.tagline || productTagline;
} catch { /* use defaults */ }

export const metadata: Metadata = {
  title: productName,
  description: productTagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
