'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type SessionLimitResponse, type ActiveSession } from '../../../context/auth-provider';
import { useShellConfig } from '../../../lib/shell-config';
import FormInput from '../../../components/vdf/form-input';
import Button from '../../../components/vdf/button';
import Alert from '../../../components/vdf/alert';
import Modal from '../../../components/vdf/modal';

export default function LoginPage() {
  const { login, revokeSessions, isAuthenticated } = useAuth();
  const { product, pages } = useShellConfig();
  console.log('[LOGIN] product:', product.name, '| pages:', pages);
  const router = useRouter();
  console.log('[LOGIN] product:', product.name, '| pages:', pages);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Session limit state
  const [sessionLimit, setSessionLimit] = useState<SessionLimitResponse | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [revokingLoading, setRevokingLoading] = useState(false);

  // Product can override the entire login page
  if (pages?.login) {
    const CustomLogin = pages.login;
    return <CustomLogin />;
  }

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.replace('/');
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);

      if ('code' in result && result.code === 'SESSION_LIMIT') {
        setSessionLimit(result);
        setLoading(false);
        return;
      }

      // Success — redirect to dashboard
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  }

  function toggleSession(sessionId: string) {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }

  async function handleRevokeSessions() {
    if (selectedSessions.size === 0) return;
    setRevokingLoading(true);
    setError('');

    try {
      const result = await revokeSessions(
        Array.from(selectedSessions),
        email,
        password,
      );

      if ('code' in result && result.code === 'SESSION_LIMIT') {
        setSessionLimit(result);
        setSelectedSessions(new Set());
        setRevokingLoading(false);
        return;
      }

      // Success
      setSessionLimit(null);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke sessions');
      setRevokingLoading(false);
    }
  }

  return (
    <>
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-surface rounded-lg shadow-lg p-8">
          {/* Branding */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-primary">{product.name}</h1>
            {product.tagline && (
              <p className="text-sm text-muted mt-1">{product.tagline}</p>
            )}
          </div>

          {/* Error alert */}
          {error && (
            <div className="mb-4">
              <Alert variant="error" message={error} dismissible onDismiss={() => setError('')} />
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoFocus
              required
              disabled={loading}
            />

            <FormInput
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              disabled={!email || !password}
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>

      {/* Session Limit Modal */}
      <Modal
        isOpen={!!sessionLimit}
        onClose={() => setSessionLimit(null)}
        title="Session Limit Reached"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            You have reached the maximum of {sessionLimit?.max_sessions} active sessions.
            Select sessions to end, then try again.
          </p>

          <div className="space-y-2">
            {sessionLimit?.active_sessions.map((session: ActiveSession) => (
              <label
                key={session.session_id}
                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                  selectedSessions.has(session.session_id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-surface-hover'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSessions.has(session.session_id)}
                  onChange={() => toggleSession(session.session_id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {session.browser || 'Unknown'} on {session.os || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted">
                    {session.device_type || 'unknown'} &middot; {session.ip_address || 'unknown IP'}
                  </p>
                  <p className="text-xs text-muted">
                    Last active: {new Date(session.last_activity_at).toLocaleString()}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {error && (
            <Alert variant="error" message={error} />
          )}

          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setSessionLimit(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={revokingLoading}
              disabled={selectedSessions.size === 0}
              onClick={handleRevokeSessions}
            >
              End {selectedSessions.size} session{selectedSessions.size !== 1 ? 's' : ''} &amp; Sign in
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
