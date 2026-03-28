'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-provider';

/**
 * Full-screen blocking overlay for invited (non-owner) users
 * while the tenant owner completes onboarding.
 */
export default function OnboardingPendingBlock() {
  const { tenant, getAuthHeaders } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const handleRefresh = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
        headers: { ...getAuthHeaders() },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tenant?.onboarding_complete) {
          router.replace('/');
          return;
        }
      }
    } catch {
      // Ignore — user can retry
    } finally {
      setIsChecking(false);
    }
  }, [apiUrl, getAuthHeaders, router]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-fg)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          marginBottom: '1.5rem',
          color: 'var(--color-info)',
        }}
      >
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Your account is being set up
      </h2>

      {tenant?.name && (
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
          {tenant.name}
        </p>
      )}

      <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: '2rem', maxWidth: 400 }}>
        Please wait while the administrator completes the setup.
        You&apos;ll be redirected automatically once everything is ready.
      </p>

      <button
        onClick={handleRefresh}
        disabled={isChecking}
        style={{
          padding: '0.5rem 1.5rem',
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-primary-fg)',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: isChecking ? 'wait' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500,
          opacity: isChecking ? 0.7 : 1,
        }}
      >
        {isChecking ? 'Checking...' : 'Refresh'}
      </button>
    </div>
  );
}
