'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useShellConfig } from '../../../lib/shell-config';
import SettingsLayout from '../../../components/settings-layout';
import ProfileTab from '../../../components/settings/profile-tab';
import SecurityTab from '../../../components/settings/security-tab';
import ThemeTab from '../../../components/settings/theme-tab';
import SessionsTab from '../../../components/settings/sessions-tab';
import BrandTab from '../../../components/settings/brand-tab';

const componentRegistry: Record<string, React.ComponentType> = {
  'profile': ProfileTab,
  'security': SecurityTab,
  'theme': ThemeTab,
  'sessions': SessionsTab,
  'brand-colors': BrandTab,
};

function SettingsInner() {
  const { settings, pages } = useShellConfig();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Product can override the entire settings page
  if (pages?.settings) {
    const CustomSettings = pages.settings;
    return <CustomSettings />;
  }

  const tabs = settings?.tabs || [];
  const activeTabId = searchParams.get('tab') || tabs[0]?.id || 'profile';
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const Component = activeTab ? componentRegistry[activeTab.component] : null;

  return (
    <SettingsLayout
      tabs={tabs}
      activeTab={activeTabId}
      onTabChange={(id) => router.replace(`/settings?tab=${id}`)}
    >
      {Component ? <Component /> : <div style={{ color: 'var(--color-muted)', fontSize: 14 }}>Tab not configured</div>}
    </SettingsLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 24, color: 'var(--color-muted)', fontSize: 14 }}>
        Loading settings...
      </div>
    }>
      <SettingsInner />
    </Suspense>
  );
}
