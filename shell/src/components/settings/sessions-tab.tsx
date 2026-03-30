'use client';

import { useState, useEffect, useCallback } from 'react';
import { Monitor, Smartphone, Tablet, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/auth-provider';

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

interface SessionInfo {
  id: string;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_activity_at: string;
  is_current: boolean;
}

function formatIp(ip: string | null): string {
  if (!ip) return 'Unknown IP';
  if (ip === '::1' || ip === '::1/128' || ip === '127.0.0.1') return 'localhost';
  return ip;
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 0 || seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function DeviceIcon({ type }: { type: string | null }) {
  const style = { color: 'var(--color-muted)', flexShrink: 0 } as React.CSSProperties;
  if (type === 'mobile') return <Smartphone size={20} style={style} />;
  if (type === 'tablet') return <Tablet size={20} style={style} />;
  return <Monitor size={20} style={style} />;
}

export default function SessionsTab() {
  const { getAuthHeaders } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/auth/sessions`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [getAuthHeaders]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  async function handleRevoke(id: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/auth/sessions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed');
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setToast('Session revoked');
      setTimeout(() => setToast(''), 2000);
    } catch {
      setToast('Failed to revoke session');
      setTimeout(() => setToast(''), 3000);
    }
  }

  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: 'var(--color-fg)' }}>
        Active sessions
      </h2>
      <p style={{ margin: '4px 0 20px', fontSize: 13, color: 'var(--color-muted)' }}>
        Devices currently signed in to your account
      </p>

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
          Loading sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
          No active sessions
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sessions.map((session) => {
            const title = (session.browser && session.browser !== 'Unknown')
              ? `${session.browser} on ${session.os || 'Unknown'}`
              : session.ip_address
                ? `Session from ${formatIp(session.ip_address)}`
                : 'Active session';

            return (
              <div
                key={session.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 8,
                  border: '0.5px solid var(--color-border)',
                }}
              >
                <DeviceIcon type={session.device_type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-fg)' }}>
                    {title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 2 }}>
                    {formatIp(session.ip_address)}
                    <span style={{ margin: '0 6px' }}>&middot;</span>
                    {timeAgo(session.last_activity_at)}
                  </div>
                </div>
                {session.is_current ? (
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 500,
                    backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                    color: 'var(--color-success)',
                  }}>
                    Current
                  </span>
                ) : (
                  <button
                    onClick={() => handleRevoke(session.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      backgroundColor: 'transparent',
                      color: 'var(--color-danger)',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Trash2 size={14} />
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

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
