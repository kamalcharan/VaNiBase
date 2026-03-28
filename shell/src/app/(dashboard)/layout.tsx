'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-provider';
import { ShellLayout } from '../../components/shell-layout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
 //   if (!isLoading && !isAuthenticated) {
   //   router.replace('/login');
  //  }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    );
  }

 // if (!isAuthenticated) {
  //  return null;
 // }

  return <ShellLayout>{children}</ShellLayout>;
}
