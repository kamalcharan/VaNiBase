'use client';

import { useShellConfig } from '../../../lib/shell-config';

export default function InviteAcceptPage() {
  const { pages } = useShellConfig();

  if (pages?.inviteAccept) {
    const CustomInviteAccept = pages.inviteAccept;
    return <CustomInviteAccept />;
  }

  return (
    <div className="w-full max-w-md text-center">
      <div className="bg-surface rounded-lg shadow-lg p-8">
        <h2 className="text-lg font-semibold text-foreground mb-2">Accept Invitation</h2>
        <p className="text-sm text-muted">
          Invite accept page not configured. Set <code>pages.inviteAccept</code> in your shell config.
        </p>
      </div>
    </div>
  );
}
