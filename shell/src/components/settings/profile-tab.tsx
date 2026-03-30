'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-provider';

const DESIGNATIONS = ['MFD', 'RIA', 'Sub-broker', 'Employee'];

const COUNTRY_CODES = [
  { flag: '🇮🇳', code: '+91' },
  { flag: '🇺🇸', code: '+1' },
  { flag: '🇬🇧', code: '+44' },
  { flag: '🇦🇪', code: '+971' },
  { flag: '🇸🇬', code: '+65' },
];

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

export default function ProfileTab() {
  const { user, getAuthHeaders } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [designation, setDesignation] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Load from auth user
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setDesignation(user.designation || '');
      setCountryCode(user.country_code || '+91');
      setMobile(user.mobile || '');
    }
  }, [user]);

  function handleCancel() {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setDesignation(user.designation || '');
      setCountryCode(user.country_code || '+91');
      setMobile(user.mobile || '');
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/auth/profile`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          designation,
          country_code: countryCode,
          mobile,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setToast('Profile updated');
      setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('Failed to save profile');
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

  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: 'var(--color-fg)' }}>
        Profile
      </h2>
      <p style={{ margin: '4px 0 20px', fontSize: 13, color: 'var(--color-muted)' }}>
        Update your personal information
      </p>

      {/* Row 1: First name + Last name */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>First name</label>
          <input
            style={inputStyle}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Last name</label>
          <input
            style={inputStyle}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
          />
        </div>
      </div>

      {/* Row 2: Email (disabled) + Designation */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Email</label>
          <input
            style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
            value={user?.email || ''}
            disabled
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Designation</label>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
          >
            <option value="">Select designation</option>
            {DESIGNATIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3: Mobile */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Mobile</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            style={{ ...inputStyle, width: 90, flex: 'none', cursor: 'pointer' }}
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>
          <input
            style={{ ...inputStyle, flex: 1 }}
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
            placeholder="9876543210"
          />
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
          {saving ? 'Saving...' : 'Save changes'}
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
