import type { Metadata } from 'next';
import './globals.css';
import { ShellLayout } from '../components/shell-layout';

export const metadata: Metadata = {
  title: 'VaNi',
  description: 'VaNi Product Framework',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="ocean-blue">
      <body className="antialiased">
        <ShellLayout>{children}</ShellLayout>
      </body>
    </html>
  );
}
