'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
  /** When used via recipe renderer */
  data?: { label?: string; variant?: ButtonVariant; disabled?: boolean };
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg hover:opacity-90',
  secondary: 'bg-surface text-foreground border border-border hover:bg-surface-hover',
  danger: 'bg-danger text-white hover:opacity-90',
  ghost: 'bg-transparent text-primary hover:bg-surface-hover',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  data,
  className = '',
  ...rest
}: ButtonProps) {
  const resolvedVariant = variant ?? data?.variant ?? 'primary';
  const resolvedDisabled = disabled ?? data?.disabled ?? false;
  const resolvedLabel = children ?? data?.label;

  return (
    <button
      disabled={resolvedDisabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-md font-medium transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[resolvedVariant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...rest}
    >
      {loading && (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {resolvedLabel}
    </button>
  );
}
