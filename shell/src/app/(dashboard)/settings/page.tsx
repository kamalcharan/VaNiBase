'use client';

import { useShellConfig } from '../../../lib/shell-config';

export default function SettingsPage() {
  const { pages } = useShellConfig();

  if (pages?.settings) {
    const CustomSettings = pages.settings;
    return <CustomSettings />;
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted">
          Settings page not configured. Set <code>pages.settings</code> in your shell config.
        </p>
      </div>
    </div>
  );
}
