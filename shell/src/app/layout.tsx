import type { Metadata } from 'next';
import './globals.css';
import { ShellLayout } from '../components/shell-layout';
import { ShellConfigProvider, DEFAULT_SHELL_CONFIG } from '../lib/shell-config';

export const metadata: Metadata = {
  title: 'VaNi',
  description: 'VaNi Product Framework',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="ocean-blue">
      <body className="antialiased">
        <ShellConfigProvider config={DEFAULT_SHELL_CONFIG}>
          <ShellLayout>{children}</ShellLayout>
        </ShellConfigProvider>
      </body>
    </html>
  );
}
