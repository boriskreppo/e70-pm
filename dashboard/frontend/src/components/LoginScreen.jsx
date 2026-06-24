import React, { useState } from 'react';
import { ACCENT, TONE } from '../tokens.js';
import { Field, DarkInput } from './ui.jsx';
import { setAuthToken, API_BASE } from '../api.js';

export function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim().toLowerCase(), password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Greška'); return; }
      setAuthToken(data.token);
      localStorage.setItem('e70_token', data.token);
      localStorage.setItem('e70_user', data.username);
      onLogin({ token: data.token, username: data.username });
    } catch { setError('Greška u konekciji'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#08090B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 360, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
          <div style={{ width: 40, height: 40, background: ACCENT, color: '#0A0B0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, letterSpacing: '-0.04em' }}>e70</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EAED', letterSpacing: '-0.01em' }}>e70 / pm</div>
            <div style={{ fontSize: 10, color: '#626873', letterSpacing: '0.12em', marginTop: 2 }}>PROJECT MANAGEMENT</div>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#848B96', marginBottom: 24 }}>▌ PRIJAVA</div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="KORISNIČKO IME">
            <DarkInput value={username} onChange={setUsername} placeholder="sale / pero / boris" autoFocus />
          </Field>
          <Field label="LOZINKA">
            <DarkInput type="password" value={password} onChange={setPassword} placeholder="••••••••••••" />
          </Field>
          {error && (
            <div style={{ fontSize: 12, color: TONE.magenta, letterSpacing: '0.06em', padding: '8px 12px', border: `1px solid ${TONE.magenta}33`, background: `${TONE.magenta}0F` }}>{error}</div>
          )}
          <button type="submit" disabled={loading || !username.trim() || !password}
            style={{ padding: '12px', background: (!loading && username.trim() && password) ? ACCENT : '#2C3138', color: (!loading && username.trim() && password) ? '#0A0B0D' : '#626873', border: 'none', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', marginTop: 8 }}>
            {loading ? 'PRIJAVLJIVANJE...' : 'PRIJAVI SE'}
          </button>
        </form>

        <div style={{ marginTop: 48, fontSize: 10, color: '#2A2E33', letterSpacing: '0.08em', textAlign: 'center' }}>e70 / pm · build 2026.05.07</div>
      </div>
    </div>
  );
}
