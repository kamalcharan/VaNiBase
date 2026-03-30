'use client';

import { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import * as LucideIcons from 'lucide-react';

// ── Types ──

interface SettingsTab {
  id: string;
  label: string;
  icon: string;
  component: string;
}

interface SettingsLayoutProps {
  tabs: SettingsTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
}

// ── Icon resolver ──

function resolveIcon(name: string): LucideIcons.LucideIcon {
  const Icon = (LucideIcons as Record<string, unknown>)[name];
  return (Icon as LucideIcons.LucideIcon) || LucideIcons.Circle;
}

// ── Component ──

export default function SettingsLayout({
  tabs,
  activeTab,
  onTabChange,
  children,
}: SettingsLayoutProps) {
  const router = useRouter();

  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: 24,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            color: 'var(--color-muted)',
            transition: 'background-color 0.15s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="Go back"
        >
          <LucideIcons.ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: 'var(--color-fg)' }}>
            Settings
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-muted)' }}>
            Manage your account preferences and security
          </p>
        </div>
      </div>

      {/* Body: tabs + content */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          minHeight: 400,
        }}
        className="settings-body"
      >
        {/* Desktop: vertical tabs */}
        <nav
          className="settings-tabs-desktop"
          style={{
            width: 200,
            flexShrink: 0,
            borderRight: '1px solid var(--color-border)',
            paddingRight: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {tabs.map((tab) => {
            const Icon = resolveIcon(tab.icon);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: isActive ? 500 : 400,
                  textAlign: 'left',
                  backgroundColor: isActive
                    ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
                    : 'transparent',
                  color: isActive
                    ? 'var(--color-primary)'
                    : 'var(--color-muted)',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Mobile: horizontal scrollable tabs */}
        <nav
          className="settings-tabs-mobile"
          style={{
            display: 'none',
            overflowX: 'auto',
            gap: 4,
            paddingBottom: 12,
            marginBottom: 16,
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {tabs.map((tab) => {
            const Icon = resolveIcon(tab.icon);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  whiteSpace: 'nowrap',
                  backgroundColor: isActive
                    ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
                    : 'transparent',
                  color: isActive
                    ? 'var(--color-primary)'
                    : 'var(--color-muted)',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div
          className="settings-content"
          style={{
            flex: 1,
            paddingLeft: 32,
            minWidth: 0,
          }}
        >
          {children}
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 639px) {
          .settings-body {
            flex-direction: column !important;
          }
          .settings-tabs-desktop {
            display: none !important;
          }
          .settings-tabs-mobile {
            display: flex !important;
          }
          .settings-content {
            padding-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
