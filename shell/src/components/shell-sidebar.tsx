'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import { useShellConfig } from '../lib/shell-config';
import { useAuth } from '../context/auth-provider';

// ── Constants ──
const STORAGE_KEY = 'vn-sidebar-collapsed';
const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 64;

// ── Icon resolver ──
function resolveIcon(iconName: string): LucideIcons.LucideIcon {
  const Icon = (LucideIcons as Record<string, unknown>)[iconName];
  return (Icon as LucideIcons.LucideIcon) || LucideIcons.Circle;
}

// ── Component ──
export default function ShellSidebar() {
  const { product, sidebar, recipes } = useShellConfig();
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const defaultCollapsed = sidebar?.defaultCollapsed ?? false;
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Load collapse state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) setCollapsed(saved === 'true');
    } catch { /* SSR */ }
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  // Build groups: from config or auto-generate from recipes
  type NavItem = { id: string; label: string; route: string; icon: string; badge?: number };
  type NavGroup = { label: string; items: NavItem[] };
  const groups: NavGroup[] = useMemo(() => {
    if (sidebar?.groups && sidebar.groups.length > 0) return sidebar.groups;
    // Auto-generate from recipes
    if (recipes.length > 0) {
      return [{
        label: 'Views',
        items: recipes.map((r) => ({
          id: r.recipe,
          label: r.label,
          route: r.route,
          icon: r.icon || 'FileText',
        })),
      }];
    }
    return [];
  }, [sidebar?.groups, recipes]);

  // Check if route is active
  const isActive = useCallback((route: string) => {
    if (pathname === route) return true;
    return pathname.startsWith(route + '/');
  }, [pathname]);

  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile toggle button */}
      <button
        className="fixed top-3 left-3 z-40 p-2 rounded-md md:hidden"
        style={{
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-fg)',
          border: '1px solid var(--color-border)',
        }}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
      >
        <LucideIcons.Menu size={20} />
      </button>

      {/* Sidebar */}
      <aside
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          transition: 'width 0.25s ease, min-width 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 20,
        }}
        className={`
          hidden md:flex
          ${mobileOpen ? '!flex !fixed !left-0 !top-0 !bottom-0 !z-40' : ''}
        `}
      >
        {/* Brand area */}
        <div
          style={{
            padding: collapsed ? '16px 8px' : '16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minHeight: 56,
          }}
        >
          {collapsed ? (
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-fg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
                margin: '0 auto',
              }}
            >
              {product.name.charAt(0)}
            </span>
          ) : (
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {product.name}
              </div>
              {product.tagline && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {product.tagline}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {groups.map((group) => (
            <div key={group.label} style={{ marginBottom: 8 }}>
              {!collapsed && (
                <div
                  style={{
                    padding: '4px 16px',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--color-muted)',
                  }}
                >
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = resolveIcon(item.icon);
                const active = isActive(item.route);
                return (
                  <Link
                    key={item.id}
                    href={item.route}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: collapsed ? '8px 0' : '8px 16px',
                      margin: collapsed ? '2px 8px' : '2px 8px',
                      borderRadius: 6,
                      fontSize: 14,
                      textDecoration: 'none',
                      transition: 'background-color 0.15s ease, color 0.15s ease',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      backgroundColor: active ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'transparent',
                      color: active ? 'var(--color-primary)' : 'var(--color-fg)',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = active
                        ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
                        : 'transparent';
                    }}
                  >
                    <Icon size={18} style={{ flexShrink: 0 }} />
                    {!collapsed && (
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                    )}
                    {!collapsed && item.badge !== undefined && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: 10,
                          backgroundColor: 'var(--color-primary)',
                          color: 'var(--color-primary-fg)',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User info + sign out */}
        {user && (
          <div style={{ padding: collapsed ? '8px' : '12px 16px', borderTop: '1px solid var(--color-border)' }}>
            {!collapsed && (
              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-fg)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.email}
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              title={collapsed ? 'Sign out' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '6px 8px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                backgroundColor: 'transparent',
                color: 'var(--color-danger)',
                justifyContent: collapsed ? 'center' : 'flex-start',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LucideIcons.LogOut size={16} />
              {!collapsed && <span>Sign out</span>}
            </button>
          </div>
        )}

        {/* Footer: Powered by VaNi + collapse toggle */}
        <div
          style={{
            padding: collapsed ? '8px' : '8px 16px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
          }}
        >
          {!collapsed && (
            <span style={{ fontSize: 10, color: 'var(--color-muted)' }}>
              Powered by VaNi
            </span>
          )}
          <button
            onClick={toggleCollapse}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
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
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <LucideIcons.ChevronsRight size={16} />
            ) : (
              <LucideIcons.ChevronsLeft size={16} />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
