'use client';

import { useShellConfig } from '../../../lib/shell-config';

export default function ForgotPasswordPage() {
  const { pages } = useShellConfig();

  if (pages?.forgotPassword) {
    const CustomForgotPassword = pages.forgotPassword;
    return <CustomForgotPassword />;
  }

  return (
    <div className="w-full max-w-md text-center">
      <div className="bg-surface rounded-lg shadow-lg p-8">
        <h2 className="text-lg font-semibold text-foreground mb-2">Forgot Password</h2>
        <p className="text-sm text-muted">
          Forgot password page not configured. Set <code>pages.forgotPassword</code> in your shell config.
        </p>
      </div>
    </div>
  );
}
