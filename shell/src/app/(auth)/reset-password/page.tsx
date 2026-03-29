'use client';

import { useShellConfig } from '../../../lib/shell-config';

export default function ResetPasswordPage() {
  const { pages } = useShellConfig();

  if (pages?.resetPassword) {
    const CustomResetPassword = pages.resetPassword;
    return <CustomResetPassword />;
  }

  return (
    <div className="w-full max-w-md text-center">
      <div className="bg-surface rounded-lg shadow-lg p-8">
        <h2 className="text-lg font-semibold text-foreground mb-2">Reset Password</h2>
        <p className="text-sm text-muted">
          Reset password page not configured. Set <code>pages.resetPassword</code> in your shell config.
        </p>
      </div>
    </div>
  );
}
