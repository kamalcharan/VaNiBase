'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import { useShellConfig } from '../lib/shell-config';
import { useAuth } from '../context/auth-provider';
import { useTheme } from './theme-provider';
import { getTheme } from '../themes';

// ── Helpers ──

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

// ── Component ──
export default function ShellNavbar() {
  const { product, sidebar, navbar, recipes } = useShellConfig();
  const { user, tenant, logout, getAuthHeaders, environment, setEnvironment } = useAuth();
  const { themeId, setTheme, themes } = useTheme();
  const { colorMode, toggleColorMode } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const showEnvToggle = navbar?.showEnvironmentToggle ?? false;
  const showNotifications = navbar?.showNotifications ?? false;

  // Determine current page title from sidebar config or recipes
  const pageTitle = useMemo(() => {
    // Check sidebar groups first
    if (sidebar?.groups) {
      for (const group of sidebar.groups) {
        for (const item of group.items) {
          if (pathname === item.route || pathname.startsWith(item.route + '/')) {
            return item.label;
          }
        }
      }
    }
    // Fallback to recipes
    for (const r of recipes) {
      if (pathname === r.route || pathname.startsWith(r.route + '/')) {
        return r.label;
      }
    }
    return product.name;
  }, [pathname, sidebar?.groups, recipes, product.name]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [dropdownOpen]);

  // Theme quick-switch handler
  const handleThemeSwitch = useCallback(async (newThemeId: string) => {
    setTheme(newThemeId);
    // Persist to backend (optimistic)
    try {
      const headers = getAuthHeaders();
      await fetch(`${getApiUrl()}/api/v1/auth/preferences`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_theme: newThemeId }),
      });
    } catch {
      // Optimistic — ignore network errors
    }
  }, [setTheme, getAuthHeaders]);

  const handleLogout = useCallback(async () => {
    setDropdownOpen(false);
    await logout();
  }, [logout]);

  return (
    <header
      style={{
        height: 56,
        minHeight: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '0.5px solid var(--color-border)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Left: Page title */}
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-fg)' }}>
        {/* Spacer for mobile menu button */}
        <span className="md:hidden" style={{ display: 'inline-block', width: 32 }} />
        {pageTitle}
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Environment toggle */}
        {showEnvToggle && (
          <button
            onClick={() => setEnvironment(environment === 'live' ? 'test' : 'live')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 16,
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-fg)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface)';
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: environment === 'live'
                  ? 'var(--color-success)'
                  : 'var(--color-warning)',
              }}
            />
            {environment === 'live' ? 'Live' : 'Test'}
          </button>
        )}

        {/* Color mode toggle */}
        <button
          onClick={toggleColorMode}
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
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="Toggle color mode"
        >
          {colorMode === 'light' ? (
            <LucideIcons.Moon size={18} />
          ) : (
            <LucideIcons.Sun size={18} />
          )}
        </button>

        {/* Notification bell */}
        {showNotifications && (
          <button
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
              position: 'relative',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Notifications"
          >
            <LucideIcons.Bell size={18} />
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'var(--color-danger)',
              }}
            />
          </button>
        )}

        {/* User dropdown trigger */}
        {user && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 8px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: 'var(--color-fg)',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {/* Avatar circle */}
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-fg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {getInitials(user.name)}
              </span>
              <LucideIcons.ChevronDown size={14} style={{ color: 'var(--color-muted)' }} />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  width: 280,
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  overflow: 'hidden',
                  zIndex: 50,
                }}
              >
                {/* User info block */}
                <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primary-fg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(user.name)}
                  </span>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.email}
                    </div>
                  </div>
                </div>

                {/* Tenant pill */}
                {tenant && (
                  <div style={{ padding: '0 16px 12px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontFamily: 'monospace',
                        backgroundColor: 'var(--color-surface-hover)',
                        color: 'var(--color-muted)',
                      }}
                    >
                      Tenant: {tenant.slug}
                    </span>
                  </div>
                )}

                <Divider />

                {/* Theme quick-switch */}
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)', marginBottom: 8 }}>
                    Theme
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {themes.map((t) => {
                      const themeConfig = getTheme(t.id);
                      const previewColor = themeConfig.colors.brand.primary;
                      const isActiveTheme = themeId === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => handleThemeSwitch(t.id)}
                          title={t.name}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: previewColor,
                            outline: isActiveTheme ? '2px solid var(--color-primary)' : 'none',
                            outlineOffset: 2,
                            transition: 'outline 0.15s ease',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                <Divider />

                {/* Menu items */}
                <div style={{ padding: '4px 0' }}>
                  <DropdownItem
                    icon={<LucideIcons.User size={16} />}
                    label="Profile"
                    onClick={() => { setDropdownOpen(false); router.push('/settings?tab=profile'); }}
                  />
                  <DropdownItem
                    icon={<LucideIcons.Settings size={16} />}
                    label="Settings"
                    onClick={() => { setDropdownOpen(false); router.push('/settings'); }}
                  />
                </div>

                <Divider />

                {/* Sign out */}
                <div style={{ padding: '4px 0' }}>
                  <DropdownItem
                    icon={<LucideIcons.LogOut size={16} />}
                    label="Sign out"
                    danger
                    onClick={handleLogout}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

// ── Subcomponents ──

function Divider() {
  return (
    <div
      style={{
        height: 1,
        backgroundColor: 'var(--color-border)',
        margin: '0 12px',
      }}
    />
  );
}

function DropdownItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 16px',
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        backgroundColor: 'transparent',
        color: danger ? 'var(--color-danger)' : 'var(--color-fg)',
        transition: 'background-color 0.15s ease',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {icon}
      {label}
    </button>
  );
}
