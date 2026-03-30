'use client';

import { useState, useCallback } from 'react';
import { useTheme } from '../theme-provider';
import { listThemes, getTheme } from '../../themes';
import { useAuth } from '../../context/auth-provider';
import { Check } from 'lucide-react';

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

export default function ThemeTab() {
  const { themeId, setTheme } = useTheme();
  const { getAuthHeaders } = useAuth();
  const [toast, setToast] = useState('');
  const allThemes = listThemes();

  const handleSelect = useCallback(async (id: string) => {
    setTheme(id); // Optimistic
    try {
      await fetch(`${getApiUrl()}/api/v1/auth/preferences`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_theme: id }),
      });
      setToast('Theme updated');
      setTimeout(() => setToast(''), 2000);
    } catch { /* optimistic — ignore */ }
  }, [setTheme, getAuthHeaders]);

  const handleReset = useCallback(async () => {
    try {
      await fetch(`${getApiUrl()}/api/v1/auth/preferences`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_theme: null }),
      });
      setToast('Reset to tenant default');
      setTimeout(() => setToast(''), 2000);
    } catch { /* ignore */ }
  }, [getAuthHeaders]);

  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: 'var(--color-fg)' }}>
        Preferred theme
      </h2>
      <p style={{ margin: '4px 0 20px', fontSize: 13, color: 'var(--color-muted)' }}>
        Your theme overrides the tenant default
      </p>

      {/* Theme grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
      }}
        className="theme-grid"
      >
        {allThemes.map((t) => {
          const config = getTheme(t.id);
          const primaryColor = config.colors.brand.primary;
          const isActive = themeId === t.id;

          return (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              style={{
                padding: 0,
                borderRadius: 10,
                border: isActive
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-border)',
                cursor: 'pointer',
                backgroundColor: 'var(--color-surface)',
                overflow: 'hidden',
                transition: 'border-color 0.15s ease',
                position: 'relative',
              }}
            >
              {/* Swatch bar */}
              <div style={{
                height: 48,
                backgroundColor: primaryColor,
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                padding: '0 12px 6px',
              }}>
                {/* Mini mock UI element */}
                <div style={{
                  width: '60%',
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.4)',
                }} />
                {/* Check icon for active */}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary-fg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Check size={12} style={{ color: primaryColor }} />
                  </div>
                )}
              </div>
              {/* Theme name */}
              <div style={{
                padding: '8px 4px',
                fontSize: 12,
                color: 'var(--color-fg)',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {t.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Reset link */}
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button
          onClick={handleReset}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 13,
            color: 'var(--color-primary)',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Reset to tenant default
        </button>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 639px) {
          .theme-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          padding: '10px 20px',
          borderRadius: 8,
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-fg)',
          border: '0.5px solid var(--color-border)',
          fontSize: 13,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 100,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
