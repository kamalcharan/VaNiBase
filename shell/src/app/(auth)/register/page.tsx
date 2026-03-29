'use client';

import { useShellConfig } from '../../../lib/shell-config';

export default function RegisterPage() {
  const { pages } = useShellConfig();

  if (pages?.register) {
    const CustomRegister = pages.register;
    return <CustomRegister />;
  }

  return (
    <div className="w-full max-w-md text-center">
      <div className="bg-surface rounded-lg shadow-lg p-8">
        <h2 className="text-lg font-semibold text-foreground mb-2">Registration</h2>
        <p className="text-sm text-muted">
          Registration page not configured. Set <code>pages.register</code> in your shell config.
        </p>
      </div>
    </div>
  );
}
