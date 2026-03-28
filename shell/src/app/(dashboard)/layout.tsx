'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-provider';
import { ShellLayout } from '../../components/shell-layout';
import OnboardingPendingBlock from '../../components/OnboardingPendingBlock';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, tenant, user } = useAuth();
  const router = useRouter();

  const onboardingComplete = tenant?.onboarding_complete !== false;
  const isOwner = user?.roles?.includes('owner') ?? false;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Owner with incomplete onboarding → redirect to /onboarding
  useEffect(() => {
    if (!isLoading && isAuthenticated && !onboardingComplete && isOwner) {
      router.replace('/onboarding');
    }
  }, [isLoading, isAuthenticated, onboardingComplete, isOwner, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
   return null;
  }

  // Non-owner with incomplete onboarding → show pending block
  if (!onboardingComplete && !isOwner) {
    return <OnboardingPendingBlock />;
  }

  // Owner with incomplete onboarding → will redirect via useEffect above
  if (!onboardingComplete && isOwner) {
    return null;
  }

  return <ShellLayout>{children}</ShellLayout>;
}
