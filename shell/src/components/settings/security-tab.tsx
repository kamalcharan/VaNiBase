'use client';

import { useState } from 'react';
import { useAuth } from '../../context/auth-provider';

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

export default function SecurityTab() {
  const { getAuthHeaders } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!currentPassword) e.currentPassword = 'Current password is required';
    if (!newPassword) e.newPassword = 'New password is required';
    else if (newPassword.length < 8) e.newPassword = 'Must be at least 8 characters';
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (confirmPassword !== newPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleCancel() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      if (res.status === 401) {
        setErrors({ currentPassword: 'Current password is incorrect' });
        setSaving(false);
        return;
      }
      if (!res.ok) throw new Error('Failed');
      handleCancel();
      setToast('Password updated');
      setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('Failed to update password');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '0.5px solid var(--color-border)',
    fontSize: 14,
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-fg)',
    width: '100%',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--color-muted)',
    marginBottom: 6,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--color-danger)',
    marginTop: 4,
  };

  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: 'var(--color-fg)' }}>
        Security
      </h2>
      <p style={{ margin: '4px 0 20px', fontSize: 13, color: 'var(--color-muted)' }}>
        Change your password
      </p>

      {/* Current password */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Current password</label>
        <input
          style={{ ...inputStyle, borderColor: errors.currentPassword ? 'var(--color-danger)' : undefined }}
          type="password"
          value={currentPassword}
          onChange={(e) => { setCurrentPassword(e.target.value); setErrors((p) => ({ ...p, currentPassword: '' })); }}
          placeholder="Enter current password"
        />
        {errors.currentPassword && <div style={errorStyle}>{errors.currentPassword}</div>}
      </div>

      {/* New password + Confirm */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>New password</label>
          <input
            style={{ ...inputStyle, borderColor: errors.newPassword ? 'var(--color-danger)' : undefined }}
            type="password"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setErrors((p) => ({ ...p, newPassword: '' })); }}
            placeholder="Min 8 characters"
          />
          {errors.newPassword && <div style={errorStyle}>{errors.newPassword}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Confirm password</label>
          <input
            style={{ ...inputStyle, borderColor: errors.confirmPassword ? 'var(--color-danger)' : undefined }}
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: '' })); }}
            placeholder="Re-enter new password"
          />
          {errors.confirmPassword && <div style={errorStyle}>{errors.confirmPassword}</div>}
        </div>
      </div>

      {/* Save bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 24,
        paddingTop: 16,
        borderTop: '0.5px solid var(--color-border)',
      }}>
        <button
          onClick={handleCancel}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: '0.5px solid var(--color-border)',
            backgroundColor: 'transparent',
            color: 'var(--color-fg)',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-primary-fg)',
            fontSize: 14,
            fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Updating...' : 'Update password'}
        </button>
      </div>

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
