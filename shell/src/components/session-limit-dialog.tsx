'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ActiveSession } from '../context/auth-types';
import {
  Monitor, Smartphone, Tablet,
  Globe, X, CheckSquare, Square, Loader2,
} from 'lucide-react';

// ── Props ──

interface SessionLimitDialogProps {
  isOpen: boolean;
  maxSessions: number;
  activeSessions: ActiveSession[];
  onRevoke: (sessionIds: string[]) => Promise<void>;
  onCancel: () => void;
  isRevoking: boolean;
  error?: string;
}

// ── Helpers ──

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 0) return 'Just now';
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function parseDevice(ua: string | null): { browser: string; device: 'desktop' | 'mobile' | 'tablet' } {
  if (!ua) return { browser: 'Unknown', device: 'desktop' };
  const browser = ua.includes('Edg') ? 'Edge' :
    ua.includes('Chrome') ? 'Chrome' :
    ua.includes('Firefox') ? 'Firefox' :
    ua.includes('Safari') ? 'Safari' : 'Unknown';
  const device: 'desktop' | 'mobile' | 'tablet' = /Mobile|Android/i.test(ua) ? 'mobile' :
    /Tablet|iPad/i.test(ua) ? 'tablet' : 'desktop';
  return { browser, device };
}

function DeviceIcon({ device }: { device: 'desktop' | 'mobile' | 'tablet' }) {
  const props = { size: 20, style: { color: 'var(--color-muted)', flexShrink: 0 } as React.CSSProperties };
  if (device === 'mobile') return <Smartphone {...props} />;
  if (device === 'tablet') return <Tablet {...props} />;
  return <Monitor {...props} />;
}

function BrowserIcon() {
  return <Globe size={14} style={{ color: 'var(--color-muted)' }} />;
}

// ── Component ──

export default function SessionLimitDialog({
  isOpen,
  maxSessions,
  activeSessions,
  onRevoke,
  onCancel,
  isRevoking,
  error,
}: SessionLimitDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState(false);

  // Animate in
  useEffect(() => {
    if (isOpen) {
      // Small delay for CSS transition
      const t = setTimeout(() => setVisible(true), 10);
      document.body.style.overflow = 'hidden';
      return () => {
        clearTimeout(t);
        document.body.style.overflow = '';
      };
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Reset selection when dialog opens with new data
  useEffect(() => {
    if (isOpen) setSelected(new Set());
  }, [isOpen, activeSessions]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isRevoking) onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, isRevoking, onCancel]);

  const toggleSession = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const allSelected = activeSessions.length > 0 && selected.size === activeSessions.length;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(activeSessions.map((s) => s.session_id)));
    }
  }, [allSelected, activeSessions]);

  const handleRevoke = useCallback(async () => {
    if (selected.size === 0) return;
    const ids = selected.size === activeSessions.length
      ? ['all']
      : Array.from(selected);
    await onRevoke(ids);
  }, [selected, activeSessions.length, onRevoke]);

  // Parsed session data
  const parsedSessions = useMemo(() =>
    activeSessions.map((s) => {
      // Use stored browser/os/device_type if available, fall back to user_agent parsing
      const ua = (s as unknown as Record<string, unknown>).user_agent as string | null ?? null;
      const parsed = parseDevice(ua);
      return {
        ...s,
        browser: s.browser || parsed.browser,
        device: (s.device_type as 'desktop' | 'mobile' | 'tablet') || parsed.device,
        os: s.os || 'Unknown OS',
      };
    }),
  [activeSessions]);

  if (!isOpen) return null;

  // Edge case: 409 but no sessions listed
  const emptySessions = activeSessions.length === 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
        onClick={isRevoking ? undefined : onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Session limit reached"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-fg)' }}>
              Session limit reached
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-muted)' }}>
              {emptySessions
                ? 'Session limit reached but no sessions found. Try again or contact support.'
                : `You have ${maxSessions} active session${maxSessions !== 1 ? 's' : ''}. Revoke one or more to continue.`}
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={isRevoking}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              cursor: isRevoking ? 'not-allowed' : 'pointer',
              backgroundColor: 'transparent',
              color: 'var(--color-muted)',
              transition: 'background-color 0.15s ease',
              flexShrink: 0,
              marginLeft: 8,
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Session list */}
        {!emptySessions && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
            {/* Select all header */}
            <button
              onClick={toggleAll}
              disabled={isRevoking}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 0',
                border: 'none',
                borderBottom: '1px solid var(--color-border)',
                cursor: isRevoking ? 'not-allowed' : 'pointer',
                backgroundColor: 'transparent',
                color: 'var(--color-muted)',
                fontSize: 12,
                fontWeight: 600,
                textAlign: 'left',
              }}
            >
              {allSelected
                ? <CheckSquare size={16} style={{ color: 'var(--color-primary)' }} />
                : <Square size={16} />}
              Select all ({activeSessions.length})
            </button>

            {/* Session rows */}
            {parsedSessions.map((session) => {
              const isSelected = selected.has(session.session_id);
              return (
                <button
                  key={session.session_id}
                  onClick={() => !isRevoking && toggleSession(session.session_id)}
                  disabled={isRevoking}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '12px 0',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: isRevoking ? 'not-allowed' : 'pointer',
                    backgroundColor: isSelected
                      ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)'
                      : 'transparent',
                    borderRadius: 6,
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {/* Checkbox */}
                  {isSelected
                    ? <CheckSquare size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    : <Square size={16} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />}

                  {/* Device icon */}
                  <DeviceIcon device={session.device} />

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--color-fg)' }}>
                      <BrowserIcon />
                      {session.browser} on {session.os}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
                      {session.ip_address || 'Unknown IP'}
                      <span style={{ margin: '0 6px' }}>&middot;</span>
                      Last active {timeAgo(session.last_activity_at)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              margin: '0 24px',
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 13,
              backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
              color: 'var(--color-danger)',
            }}
          >
            {error}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <button
            onClick={onCancel}
            disabled={isRevoking}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              cursor: isRevoking ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 500,
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
            Cancel
          </button>
          {!emptySessions && (
            <button
              onClick={handleRevoke}
              disabled={selected.size === 0 || isRevoking}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                cursor: selected.size === 0 || isRevoking ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: selected.size > 0
                  ? 'var(--color-danger)'
                  : 'var(--color-surface-hover)',
                color: selected.size > 0
                  ? 'var(--color-primary-fg)'
                  : 'var(--color-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'background-color 0.15s ease, opacity 0.15s ease',
                opacity: selected.size === 0 ? 0.6 : 1,
              }}
            >
              {isRevoking && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {isRevoking
                ? 'Revoking...'
                : `Revoke ${selected.size} session${selected.size !== 1 ? 's' : ''} & login`}
            </button>
          )}
        </div>
      </div>

      {/* Spinner keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
