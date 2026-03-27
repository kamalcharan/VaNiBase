'use client';

import { useState, type ReactNode } from 'react';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message?: string;
  children?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  /** When used via recipe renderer */
  data?: { variant?: AlertVariant; title?: string; message?: string };
}

const variantStyles: Record<AlertVariant, { border: string; bg: string; text: string }> = {
  success: { border: 'border-l-success', bg: 'bg-success/10', text: 'text-success' },
  error: { border: 'border-l-danger', bg: 'bg-danger/10', text: 'text-danger' },
  warning: { border: 'border-l-warning', bg: 'bg-warning/10', text: 'text-warning' },
  info: { border: 'border-l-info', bg: 'bg-info/10', text: 'text-info' },
};

function AlertIcon({ variant }: { variant: AlertVariant }) {
  const cls = `w-5 h-5 ${variantStyles[variant].text}`;
  switch (variant) {
    case 'success':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'error':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'warning':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case 'info':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

export default function Alert({
  variant = 'info',
  title,
  message,
  children,
  dismissible = false,
  onDismiss,
  data,
}: AlertProps) {
  const [dismissed, setDismissed] = useState(false);

  const resolvedVariant = variant ?? data?.variant ?? 'info';
  const resolvedTitle = title ?? data?.title;
  const resolvedMessage = message ?? data?.message;
  const styles = variantStyles[resolvedVariant];

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`${styles.bg} ${styles.border} border-l-4 rounded-md p-4 flex items-start gap-3`}
      role="alert"
    >
      <AlertIcon variant={resolvedVariant} />
      <div className="flex-1 min-w-0">
        {resolvedTitle && (
          <p className={`text-sm font-semibold ${styles.text}`}>{resolvedTitle}</p>
        )}
        {resolvedMessage && (
          <p className="text-sm text-foreground mt-0.5">{resolvedMessage}</p>
        )}
        {children}
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="p-1 text-muted hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
