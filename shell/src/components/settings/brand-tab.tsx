'use client';

import { useState } from 'react';
import { useAuth } from '../../context/auth-provider';

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

export default function BrandTab() {
  const { tenant, getAuthHeaders } = useAuth();

  const [primaryColor, setPrimaryColor] = useState(tenant?.brand_color || '#4b998c');
  const [secondaryColor, setSecondaryColor] = useState('#928163');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  function handleCancel() {
    setPrimaryColor(tenant?.brand_color || '#4b998c');
    setSecondaryColor('#928163');
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/tenant/profile`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_color: primaryColor }),
      });
      if (!res.ok) throw new Error('Failed');
      setToast('Brand updated');
      setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('Failed to update brand');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--color-muted)',
    marginBottom: 6,
  };

  const hexInputStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '0.5px solid var(--color-border)',
    fontSize: 14,
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-fg)',
    width: 100,
    outline: 'none',
    fontFamily: 'monospace',
  };

  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: 'var(--color-fg)' }}>
        Brand colors
      </h2>
      <p style={{ margin: '4px 0 20px', fontSize: 13, color: 'var(--color-muted)' }}>
        Set your organization&apos;s brand identity
      </p>

      {/* Color pickers */}
      <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
        {/* Primary */}
        <div>
          <label style={labelStyle}>Primary color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                border: '0.5px solid var(--color-border)',
                cursor: 'pointer',
                padding: 2,
                backgroundColor: 'var(--color-surface)',
              }}
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              style={hexInputStyle}
              maxLength={7}
            />
          </div>
        </div>

        {/* Secondary */}
        <div>
          <label style={labelStyle}>Secondary color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                border: '0.5px solid var(--color-border)',
                cursor: 'pointer',
                padding: 2,
                backgroundColor: 'var(--color-surface)',
              }}
            />
            <input
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              style={hexInputStyle}
              maxLength={7}
            />
          </div>
        </div>
      </div>

      {/* Logo upload placeholder */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Logo</label>
        <div style={{
          padding: '24px 16px',
          borderRadius: 8,
          border: '1.5px dashed var(--color-border)',
          textAlign: 'center',
          color: 'var(--color-muted)',
          fontSize: 13,
          cursor: 'pointer',
        }}>
          Click to upload or drag & drop
          <br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>PNG or SVG, max 2MB</span>
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
          {saving ? 'Saving...' : 'Save brand'}
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
