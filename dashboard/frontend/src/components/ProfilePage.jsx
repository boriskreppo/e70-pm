import React, { useState, useEffect } from 'react';
import { ACCENT, TONE, APP_USERS } from '../tokens.js';
import { api } from '../api.js';
import { toast } from './Toast.jsx';
import { Avatar } from './ui.jsx';
import { TopBar } from './TopBar.jsx';
import { ChevronLeft } from '../icons.jsx';

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', color: '#848B96', marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function DarkInput({ value, onChange, placeholder, type = 'text', autoComplete }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete}
      style={{ width: '100%', background: '#0F1114', border: '1px solid #2C3138', color: '#E8EAED', fontSize: 13, padding: '10px 12px', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
  );
}

export function ProfilePage({ user, online, onBack, onLogout, onProfileUpdate }) {
  const appUser = APP_USERS.find(u => u.username === user.username);
  const avatarColor = appUser?.color || ACCENT;

  const [profile, setProfile] = useState({ displayName: '', email: '' });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    api('/auth/profile').then(p => {
      setProfile({ displayName: p.displayName || '', email: p.email || '' });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const p = await api('/auth/profile', { method: 'PUT', body: JSON.stringify({ displayName: profile.displayName, email: profile.email }) });
      setProfile({ displayName: p.displayName || '', email: p.email || '' });
      onProfileUpdate({ ...user, displayName: p.displayName, email: p.email });
      toast('Profil sačuvan');
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { toast('Lozinke se ne poklapaju', 'error'); return; }
    if (pwForm.next.length < 6) { toast('Lozinka mora imati najmanje 6 karaktera', 'error'); return; }
    setPwSaving(true);
    try {
      await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }) });
      setPwForm({ current: '', next: '', confirm: '' });
      toast('Lozinka promijenjena');
    } catch (e) { toast(e.message, 'error'); }
    finally { setPwSaving(false); }
  };

  const breadcrumb = <><span>INTERNAL</span><span style={{ color: '#2A2E33' }}>/</span><span>PM</span><span style={{ color: '#2A2E33' }}>/</span><span style={{ color: '#E8EAED' }}>PROFIL</span></>;

  const topRight = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 11, color: '#E8EAED', fontWeight: 600, letterSpacing: '0.1em' }}>{user.username.toUpperCase()}</span>
      <button onClick={onLogout} style={{ fontSize: 10, color: '#848B96', background: 'transparent', border: '1px solid #2C3138', padding: '3px 10px', cursor: 'pointer', letterSpacing: '0.1em', fontWeight: 600 }}>ODJAVA</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#08090B' }}>
      <TopBar breadcrumb={breadcrumb} right={topRight} online={online} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '36px 28px' }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: '#E8EAED', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', cursor: 'pointer', marginBottom: 32, padding: 0 }}>
          <ChevronLeft /> NAZAD
        </button>

        {/* Avatar + username */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40 }}>
          <Avatar initials={appUser?.initials || user.username.slice(0,3).toUpperCase()} color={avatarColor} size={64} />
          <div>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#F5F6F7', letterSpacing: '-0.02em' }}>
              {profile.displayName || user.username}
            </div>
            <div style={{ fontSize: 11, color: '#848B96', letterSpacing: '0.1em', marginTop: 4 }}>@{user.username}</div>
          </div>
        </div>

        {loading ? (
          <div style={{ fontSize: 11, color: '#626873', letterSpacing: '0.14em' }}>UČITAVANJE...</div>
        ) : (
          <>
            {/* Profile section */}
            <div style={{ background: '#0A0B0D', border: '1px solid #2C3138', marginBottom: 20 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #22262B' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#848B96' }}>▌ PODACI PROFILA</div>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="KORISNIČKO IME">
                  <input value={user.username} disabled
                    style={{ width: '100%', background: '#0A0B0D', border: '1px solid #2C3138', color: '#626873', fontSize: 13, padding: '10px 12px', outline: 'none', boxSizing: 'border-box', cursor: 'not-allowed' }} />
                </Field>
                <Field label="IME I PREZIME">
                  <DarkInput value={profile.displayName} onChange={v => setProfile(p => ({ ...p, displayName: v }))} placeholder="Tvoje ime..." />
                </Field>
                <Field label="EMAIL">
                  <DarkInput type="email" value={profile.email} onChange={v => setProfile(p => ({ ...p, email: v }))} placeholder="tvoj@email.com" autoComplete="email" />
                </Field>
              </div>
              <div style={{ padding: '14px 20px', borderTop: '1px solid #22262B', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={saveProfile} disabled={saving}
                  style={{ padding: '9px 20px', background: saving ? '#2C3138' : ACCENT, color: saving ? '#626873' : '#0A0B0D', border: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', cursor: saving ? 'default' : 'pointer' }}>
                  {saving ? 'ČUVANJE...' : 'SAČUVAJ'}
                </button>
              </div>
            </div>

            {/* Password section */}
            <div style={{ background: '#0A0B0D', border: '1px solid #2C3138' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #22262B' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#848B96' }}>▌ PROMJENA LOZINKE</div>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="TRENUTNA LOZINKA">
                  <DarkInput type="password" value={pwForm.current} onChange={v => setPwForm(f => ({ ...f, current: v }))} placeholder="••••••••" autoComplete="current-password" />
                </Field>
                <Field label="NOVA LOZINKA">
                  <DarkInput type="password" value={pwForm.next} onChange={v => setPwForm(f => ({ ...f, next: v }))} placeholder="Minimum 6 karaktera" autoComplete="new-password" />
                </Field>
                <Field label="POTVRDI NOVU LOZINKU">
                  <DarkInput type="password" value={pwForm.confirm} onChange={v => setPwForm(f => ({ ...f, confirm: v }))} placeholder="Ponovi lozinku" autoComplete="new-password" />
                </Field>
                {pwForm.next && pwForm.confirm && pwForm.next !== pwForm.confirm && (
                  <div style={{ fontSize: 11, color: TONE.magenta, letterSpacing: '0.06em' }}>Lozinke se ne poklapaju</div>
                )}
              </div>
              <div style={{ padding: '14px 20px', borderTop: '1px solid #22262B', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={changePassword}
                  disabled={pwSaving || !pwForm.current || !pwForm.next || !pwForm.confirm || pwForm.next !== pwForm.confirm}
                  style={{ padding: '9px 20px', background: (!pwSaving && pwForm.current && pwForm.next && pwForm.confirm && pwForm.next === pwForm.confirm) ? '#FF3DAA' : '#2C3138', color: (!pwSaving && pwForm.current && pwForm.next && pwForm.confirm && pwForm.next === pwForm.confirm) ? '#0A0B0D' : '#626873', border: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}>
                  {pwSaving ? 'ČUVANJE...' : 'PROMIJENI LOZINKU'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
