'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ActiveSession } from '../context/auth-types';
import {
  Monitor, Smartphone, Tablet,
  Globe, X, Loader2,
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

function parseDeviceFromUA(ua: string | null): { browser: string; os: string; device: 'desktop' | 'mobile' | 'tablet' } {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'desktop' };

  const browser = ua.includes('Edg') ? 'Edge' :
    ua.includes('Chrome') ? 'Chrome' :
    ua.includes('Firefox') ? 'Firefox' :
    ua.includes('Safari') ? 'Safari' : 'Unknown';

  const os = ua.includes('Windows') ? 'Windows' :
    ua.includes('Mac OS') ? 'macOS' :
    ua.includes('iPhone') || ua.includes('iPad') ? 'iOS' :
    ua.includes('Android') ? 'Android' :
    ua.includes('Linux') ? 'Linux' : 'Unknown';

  const device: 'desktop' | 'mobile' | 'tablet' = /Mobile|Android(?!.*Tablet)/i.test(ua) ? 'mobile' :
    /Tablet|iPad/i.test(ua) ? 'tablet' : 'desktop';

  return { browser, os, device };
}

function formatIp(ip: string | null): string {
  if (!ip) return '';
  if (ip === '::1' || ip === '::1/128' || ip === '127.0.0.1') return 'localhost';
  return ip;
}

function DeviceIcon({ device }: { device: 'desktop' | 'mobile' | 'tablet' }) {
  if (device === 'mobile') return <Smartphone size={20} />;
  if (device === 'tablet') return <Tablet size={20} />;
  return <Monitor size={20} />;
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

  // Reset selection when dialog opens
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

  // Parse session display data
  const parsedSessions = useMemo(() =>
    activeSessions.map((s) => {
      const ua = (s as unknown as Record<string, unknown>).user_agent as string | null ?? null;
      const parsed = parseDeviceFromUA(ua);

      const hasBrowser = s.browser && s.browser !== 'Unknown';
      const hasOs = s.os && s.os !== 'Unknown';
      const ip = formatIp(s.ip_address);

      // Build a readable title
      let title: string;
      if (hasBrowser && hasOs) {
        title = `${s.browser} on ${s.os}`;
      } else if (parsed.browser !== 'Unknown' && parsed.os !== 'Unknown') {
        title = `${parsed.browser} on ${parsed.os}`;
      } else if (ip && ip !== 'localhost') {
        title = `Session from ${ip}`;
      } else {
        title = 'Active session';
      }

      return {
        ...s,
        title,
        device: (s.device_type as 'desktop' | 'mobile' | 'tablet') || parsed.device,
        formattedIp: ip,
      };
    }),
  [activeSessions]);

  if (!isOpen) return null;

  const emptySessions = activeSessions.length === 0;
  const hasSelection = selected.size > 0;

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
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        }}
        onClick={isRevoking ? undefined : onCancel}
        aria-hidden="true"
      />

      {/* Dialog card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Session limit reached"
        style={{
          position: 'relative',
          width: '90vw',
          maxWidth: 480,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-bg)',
          border: '0.5px solid var(--color-border)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{ padding: 24, paddingBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h2 style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 500,
              color: 'var(--color-fg)',
            }}>
              Session limit reached
            </h2>
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
                flexShrink: 0,
                marginLeft: 8,
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <p style={{
            margin: '8px 0 0',
            fontSize: 14,
            color: 'var(--color-muted)',
            lineHeight: 1.4,
          }}>
            {emptySessions
              ? 'Session limit reached but no sessions found. Try again or contact support.'
              : `You have ${maxSessions} active session${maxSessions !== 1 ? 's' : ''}. Revoke one or more to continue.`}
          </p>
        </div>

        {/* Session list */}
        {!emptySessions && (
          <div style={{ padding: '0 24px', maxHeight: 300, overflowY: 'auto' }}>
            {/* Select all */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
              cursor: isRevoking ? 'not-allowed' : 'pointer',
            }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                disabled={isRevoking}
                style={{
                  width: 18,
                  height: 18,
                  accentColor: 'var(--color-primary)',
                  cursor: isRevoking ? 'not-allowed' : 'pointer',
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                Select all sessions
              </span>
            </label>

            {/* Session cards */}
            {parsedSessions.map((session) => {
              const isSelected = selected.has(session.session_id);
              return (
                <label
                  key={session.session_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    marginBottom: 8,
                    backgroundColor: 'var(--color-surface)',
                    border: isSelected
                      ? '1px solid var(--color-primary)'
                      : '0.5px solid var(--color-border)',
                    borderRadius: 8,
                    cursor: isRevoking ? 'not-allowed' : 'pointer',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => !isRevoking && toggleSession(session.session_id)}
                    disabled={isRevoking}
                    style={{
                      width: 18,
                      height: 18,
                      accentColor: 'var(--color-primary)',
                      cursor: isRevoking ? 'not-allowed' : 'pointer',
                      flexShrink: 0,
                    }}
                  />

                  {/* Device icon */}
                  <div style={{ color: 'var(--color-muted)', flexShrink: 0 }}>
                    <DeviceIcon device={session.device} />
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--color-fg)',
                    }}>
                      <Globe size={14} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                      {session.title}
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: 'var(--color-muted)',
                      marginTop: 2,
                    }}>
                      {session.formattedIp || 'Unknown IP'}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: 'var(--color-muted)',
                      marginTop: 2,
                      opacity: 0.7,
                    }}>
                      Last active {timeAgo(session.last_activity_at)}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            margin: '8px 24px 0',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 13,
            backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
            color: 'var(--color-danger)',
          }}>
            {error}
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          borderTop: '1px solid var(--color-border)',
          marginTop: 8,
        }}>
          {/* Cancel button */}
          <button
            onClick={onCancel}
            disabled={isRevoking}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '0.5px solid var(--color-border)',
              cursor: isRevoking ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 500,
              backgroundColor: 'transparent',
              color: 'var(--color-fg)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isRevoking) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Cancel
          </button>

          {/* Revoke & Sign in button */}
          {!emptySessions && (
            <button
              onClick={handleRevoke}
              disabled={!hasSelection || isRevoking}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                cursor: !hasSelection || isRevoking ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 600,
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-fg)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'opacity 0.15s ease',
                opacity: !hasSelection || isRevoking ? 0.5 : 1,
              }}
            >
              {isRevoking && <Loader2 size={14} className="vn-spin" />}
              {isRevoking
                ? 'Revoking...'
                : `Revoke ${selected.size} session${selected.size !== 1 ? 's' : ''} & sign in`}
            </button>
          )}
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`
        .vn-spin { animation: vn-spin 1s linear infinite; }
        @keyframes vn-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
