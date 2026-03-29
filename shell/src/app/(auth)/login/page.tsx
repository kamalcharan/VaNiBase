'use client';

import { useState, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type SessionLimitResponse } from '../../../context/auth-provider';
import { useShellConfig } from '../../../lib/shell-config';
import FormInput from '../../../components/vdf/form-input';
import Button from '../../../components/vdf/button';
import Alert from '../../../components/vdf/alert';
import SessionLimitDialog from '../../../components/session-limit-dialog';

export default function LoginPage() {
  const { login, revokeSessions, isAuthenticated } = useAuth();
  const { product, pages } = useShellConfig();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Session limit state
  const [sessionLimit, setSessionLimit] = useState<SessionLimitResponse | null>(null);
  const [revokingLoading, setRevokingLoading] = useState(false);
  const [revokeError, setRevokeError] = useState('');

  // Keep password in ref for revoke call (doesn't trigger re-renders)
  const passwordRef = useRef<string>('');

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
    passwordRef.current = password;

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

  async function handleRevoke(sessionIds: string[]) {
    setRevokingLoading(true);
    setRevokeError('');

    try {
      const result = await revokeSessions(
        sessionIds,
        email,
        passwordRef.current,
      );

      // Check if STILL hitting session limit after revoke
      if ('code' in result && result.code === 'SESSION_LIMIT') {
        // Edge case: revoked sessions but still at limit
        if (result.active_sessions.length === 0) {
          setRevokeError('Unable to create session. Contact support.');
        } else {
          setSessionLimit(result);
        }
        setRevokingLoading(false);
        return;
      }

      // Success — clear dialog and redirect
      setSessionLimit(null);
      setRevokingLoading(false);
      router.replace('/');
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : 'Failed to revoke sessions');
      setRevokingLoading(false);
    }
  }

  function handleCancel() {
    setSessionLimit(null);
    setRevokeError('');
    // Don't clear form — user might want to retry
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
              onChange={(e) => {
                setPassword(e.target.value);
                passwordRef.current = e.target.value;
              }}
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

      {/* Session Limit Dialog */}
      <SessionLimitDialog
        isOpen={sessionLimit !== null}
        maxSessions={sessionLimit?.max_sessions ?? 0}
        activeSessions={sessionLimit?.active_sessions ?? []}
        onRevoke={handleRevoke}
        onCancel={handleCancel}
        isRevoking={revokingLoading}
        error={revokeError}
      />
    </>
  );
}
