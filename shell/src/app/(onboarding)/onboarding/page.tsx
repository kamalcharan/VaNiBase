'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/auth-provider';
import { useShellConfig } from '../../../lib/shell-config';
import type { OnboardingStepDef } from '../../../lib/onboarding-steps';

interface OnboardingStatusResponse {
  complete: boolean;
  steps: { step_id: string; status: string; completed_at: string | null; metadata: Record<string, unknown> }[];
  next_incomplete_step: string | null;
}

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

export default function OnboardingPage() {
  const { getAuthHeaders } = useAuth();
  const { onboarding, onboardingRegistry, product } = useShellConfig();
  useRouter();
  const apiUrl = getApiUrl();

  const allSteps: OnboardingStepDef[] = onboarding?.steps ?? [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Fetch onboarding status on mount
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/onboarding/status`, {
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) {
        setIsLoadingStatus(false);
        return;
      }
      const data: OnboardingStatusResponse = await res.json();

      if (data.complete) {
        window.location.href = '/';
        return;
      }

      // Mark completed steps
      const completed = new Set<string>();
      for (const step of data.steps) {
        if (step.status === 'completed') {
          completed.add(step.step_id);
        }
      }
      setCompletedSteps(completed);

      // Resume at next incomplete step
      if (data.next_incomplete_step) {
        const idx = allSteps.findIndex((s) => s.id === data.next_incomplete_step);
        if (idx >= 0) setCurrentIndex(idx);
      }
    } catch {
      // Proceed with default state
    } finally {
      setIsLoadingStatus(false);
    }
  }, [apiUrl, getAuthHeaders, allSteps]);

  useEffect(() => {
    fetchStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStep = allSteps[currentIndex];
  const isLastStep = currentIndex === allSteps.length - 1;

  const advanceOrFinish = useCallback(async () => {
    if (isLastStep) {
      // Refresh auth state so onboarding_complete is updated
      try {
        await fetch(`${apiUrl}/api/v1/auth/me`, {
          headers: { ...getAuthHeaders() },
        });
      } catch {
        // Continue to redirect even if /me fails
      }
      // Full page navigation to reset all state
      window.location.href = '/';
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [isLastStep, apiUrl, getAuthHeaders]);

  // Called by product step components or the default Continue button
  const handleComplete = useCallback(async () => {
    if (!currentStep) return;
    setIsSubmitting(true);
    try {
      if (currentStep.mandatory) {
        await fetch(`${apiUrl}/api/v1/onboarding/step`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ step_id: currentStep.id, status: 'completed' }),
        });
        setCompletedSteps((prev) => new Set(prev).add(currentStep.id));
      }
      await advanceOrFinish();
    } catch {
      await advanceOrFinish();
    } finally {
      setIsSubmitting(false);
    }
  }, [currentStep, apiUrl, getAuthHeaders, advanceOrFinish]);

  const handleSkip = useCallback(async () => {
    await advanceOrFinish();
  }, [advanceOrFinish]);

  if (isLoadingStatus || allSteps.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted">Loading onboarding...</div>
      </div>
    );
  }

  // Resolve the step component from onboardingRegistry
  const StepComponent = currentStep?.component && onboardingRegistry
    ? onboardingRegistry[currentStep.component]
    : null;

  // Step indicator dots (shared between both layouts)
  const stepDots = (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {allSteps.map((step, idx) => {
        const isDone = completedSteps.has(step.id) || idx < currentIndex;
        const isCurrent = idx === currentIndex;
        return (
          <div
            key={step.id}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isDone
                ? 'var(--color-success)'
                : isCurrent
                  ? 'var(--color-primary)'
                  : 'var(--color-border)',
              transition: 'background-color 0.2s',
            }}
            title={step.label}
          />
        );
      })}
    </div>
  );

  // Product component registered — render full-width with minimal top bar
  if (StepComponent) {
    return (
      <div style={{ minHeight: '100vh', color: 'var(--color-fg)' }}>
        {/* Minimal top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
            {product.name}
          </span>
          {stepDots}
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            {currentIndex + 1} / {allSteps.length}
          </span>
        </div>

        {/* Full-width step component */}
        <StepComponent
          onComplete={handleComplete}
          onSkip={currentStep.mandatory ? undefined : handleSkip}
        />
      </div>
    );
  }

  // Fallback when no product component registered
  return (
    <div style={{ minHeight: '100vh', color: 'var(--color-fg)' }}>
      {/* Minimal top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
          {product.name}
        </span>
        {stepDots}
        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
          {currentIndex + 1} / {allSteps.length}
        </span>
      </div>

      {/* Unknown step fallback */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 1.5rem',
          color: 'var(--color-muted)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
          Unknown step: {currentStep.component || currentStep.id}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {!currentStep.mandatory && !isLastStep && (
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: 'transparent',
                color: 'var(--color-muted)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Skip
            </button>
          )}
          <button
            onClick={handleComplete}
            disabled={isSubmitting}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-primary-fg)',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: isSubmitting ? 'wait' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? 'Saving...' : isLastStep ? 'Finish' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
