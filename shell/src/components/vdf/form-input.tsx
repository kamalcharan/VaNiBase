'use client';

import { useState, useId, type InputHTMLAttributes } from 'react';

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  /** When used via recipe renderer */
  data?: { label?: string; value?: string; error?: string; placeholder?: string };
}

export default function FormInput({
  label,
  error,
  type = 'text',
  data,
  className = '',
  id: externalId,
  ...rest
}: FormInputProps) {
  const autoId = useId();
  const inputId = externalId || autoId;
  const [showPassword, setShowPassword] = useState(false);

  // Allow recipe-driven props via data
  const resolvedLabel = label ?? data?.label;
  const resolvedError = error ?? data?.error;
  const resolvedPlaceholder = rest.placeholder ?? data?.placeholder;
  const resolvedValue = rest.value ?? data?.value;

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const hasError = !!resolvedError;

  return (
    <div className={className}>
      {resolvedLabel && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-foreground mb-1"
        >
          {resolvedLabel}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={inputType}
          placeholder={resolvedPlaceholder}
          value={resolvedValue}
          className={`
            w-full px-3 py-2 rounded-md text-sm
            bg-surface text-foreground
            border transition-colors
            placeholder:text-muted
            focus:outline-none focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${hasError
              ? 'border-danger focus:ring-danger/30'
              : 'border-border focus:ring-primary/30 focus:border-primary'
            }
            ${isPassword ? 'pr-10' : ''}
          `}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
      {resolvedError && (
        <p className="mt-1 text-xs text-danger">{resolvedError}</p>
      )}
    </div>
  );
}
