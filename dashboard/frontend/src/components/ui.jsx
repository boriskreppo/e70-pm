import React, { useState } from 'react';
import { ACCENT, TONE } from '../tokens.js';
import { tc, hexToRgba } from '../utils.js';
import { APP_USERS } from '../tokens.js';

export function Avatar({ initials, color, size = 26 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: hexToRgba(color, 0.12), border: `1px solid ${hexToRgba(color, 0.4)}`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 600, flexShrink: 0 }}>
      {initials || '?'}
    </div>
  );
}

export function StatusChip({ status }) {
  const color = tc(({ 'AKTIVNO': 'lime', 'USKORO': 'amber', 'PROBIJEN ROK': 'magenta', 'ZAVRŠEN': 'cyan', 'PAUZIRAN': 'neutral' })[status] || 'neutral');
  const pulse = status === 'AKTIVNO';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color }}>
      <span style={{ width: 6, height: 6, background: color, borderRadius: '50%', animation: pulse ? 'pulse 1.6s ease-out infinite' : 'none' }} />
      {status}
    </div>
  );
}

export function PriorityChip({ priority }) {
  const PRIO = {
    'KRITIČAN': '#EF4444',
    'VISOK':    '#F97316',
    'SREDNJI':  '#3B82F6',
    'NIZAK':    '#22C55E',
  };
  const color = PRIO[priority] || '#6B7280';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', border: `1px solid ${color}33`, background: `${color}0F`, color, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em' }}>
      <span style={{ width: 8, height: 8, background: color, borderRadius: '50%', flexShrink: 0 }} />
      {priority}
    </div>
  );
}

export function TagChip({ tag, onRemove }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: hexToRgba(ACCENT, 0.1), border: `1px solid ${hexToRgba(ACCENT, 0.25)}`, color: ACCENT, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', padding: '2px 7px' }}>
      {tag}
      {onRemove && <button onClick={onRemove} style={{ background: 'transparent', border: 'none', color: hexToRgba(ACCENT, 0.66), cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>}
    </span>
  );
}

export function ProgressBar({ value, tone = 'lime' }) {
  const color = tc(tone);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 2, background: '#2C3138', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${value}%`, background: color }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color, minWidth: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}%</div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', color: '#848B96', marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

export function DarkInput({ value, onChange, placeholder, type = 'text', autoFocus, maxLength, onKeyDown }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} maxLength={maxLength} onKeyDown={onKeyDown} style={{ width: '100%', background: '#0F1114', border: '1px solid #2C3138', color: '#E8EAED', fontSize: 13, padding: '10px 12px', outline: 'none', colorScheme: 'dark' }} />;
}

export function DarkTextarea({ value, onChange, placeholder }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ width: '100%', background: '#0F1114', border: '1px solid #2C3138', color: '#E8EAED', fontSize: 13, padding: '10px 12px', outline: 'none', resize: 'vertical' }} />;
}

export function DarkSelect({ value, onChange, options }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', background: '#0F1114', border: '1px solid #2C3138', color: '#E8EAED', fontSize: 13, padding: '10px 12px', outline: 'none', colorScheme: 'dark', cursor: 'pointer' }}>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>;
}

export function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim().toUpperCase();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput('');
  };
  return (
    <div>
      {tags.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>{tags.map(t => <TagChip key={t} tag={t} onRemove={() => onChange(tags.filter(x => x !== t))} />)}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <DarkInput value={input} onChange={setInput} placeholder="Dodaj tag..." onKeyDown={e => e.key === 'Enter' && add()} />
        <button onClick={add} style={{ padding: '10px 16px', background: '#2C3138', border: 'none', color: '#E8EAED', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+</button>
      </div>
    </div>
  );
}

export function OwnerSelect({ initials, onChange }) {
  const handleChange = (val) => {
    if (!val) { onChange('', ACCENT); return; }
    const u = APP_USERS.find(u => u.initials === val);
    onChange(u ? u.initials : val, u ? u.color : ACCENT);
  };
  return (
    <select value={initials} onChange={e => handleChange(e.target.value)}
      style={{ width: '100%', background: '#0F1114', border: '1px solid #2C3138', color: initials ? '#E8EAED' : '#626873', fontSize: 13, padding: '10px 12px', outline: 'none', colorScheme: 'dark', cursor: 'pointer' }}>
      <option value="">— nijedan —</option>
      {APP_USERS.map(u => <option key={u.initials} value={u.initials}>{u.username} ({u.initials})</option>)}
    </select>
  );
}

export function StatCard({ label, value, tone, delta, isLast }) {
  const color = tc(tone);
  const filled = Math.min(12, Math.round((value / 5) * 12));
  return (
    <div className="stat-card" style={{ padding: '28px 28px 24px', borderRight: isLast ? 'none' : '1px solid #2C3138', display: 'flex', flexDirection: 'column', gap: 18, minHeight: 168 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', color: '#848B96' }}>▌ {label}</div>
        <div style={{ fontSize: 10, letterSpacing: '0.08em', color: '#848B96', fontVariantNumeric: 'tabular-nums' }}>{delta}</div>
      </div>
      <div className="stat-number" style={{ fontSize: 88, lineHeight: 0.9, fontWeight: 500, color, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{ display: 'flex', gap: 3, height: 3 }}>
        {Array.from({ length: 12 }).map((_, k) => <div key={k} style={{ flex: 1, background: k < filled ? color : '#2C3138' }} />)}
      </div>
    </div>
  );
}

export function MetaCell({ label, value, tone, mono, isLast }) {
  const color = tc(tone);
  return (
    <div className="meta-cell" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '20px 24px', flex: 1, borderRight: isLast ? 'none' : '1px solid #2C3138' }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', color: '#848B96' }}>▌ {label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color, fontVariantNumeric: 'tabular-nums', fontFamily: mono ? "'Geist Mono', ui-monospace, monospace" : 'inherit' }}>{value}</div>
    </div>
  );
}

export function Footer({ left }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderTop: '1px solid #22262B', fontSize: 10, letterSpacing: '0.12em', color: '#626873', fontVariantNumeric: 'tabular-nums' }}>
      <div style={{ display: 'flex', gap: 18 }}>{left}</div>
      <div>e70 / pm · build 2026.05.07</div>
    </div>
  );
}

export function StatusBlock({ status }) {
  const tone = ({ 'AKTIVNO': 'lime', 'USKORO': 'amber', 'PROBIJEN ROK': 'magenta', 'ZAVRŠEN': 'cyan', 'PAUZIRAN': 'neutral' })[status] || 'neutral';
  const color = tc(tone);
  const textColor = (tone === 'lime' || tone === 'amber' || tone === 'cyan') ? '#0A0B0D' : '#F5F6F7';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px 8px',
      background: color,
      color: textColor,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.08em',
      width: '100%',
      height: 28,
      textAlign: 'center',
      userSelect: 'none',
      textTransform: 'uppercase'
    }}>
      {status}
    </div>
  );
}

export function PriorityBlock({ priority }) {
  const PRIO_STYLES = {
    'KRITIČAN': { color: '#EF4444', bg: '#140808' },
    'VISOK':    { color: '#F97316', bg: '#140D06' },
    'SREDNJI':  { color: '#3B82F6', bg: '#080E1A' },
    'NIZAK':    { color: '#22C55E', bg: '#08150D' },
  };
  const s = PRIO_STYLES[priority] || { color: '#6B7280', bg: '#111317' };
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 10px',
      borderLeft: `3px solid ${s.color}`,
      background: s.bg,
      color: s.color,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.06em',
      width: '100%',
      height: 28,
      userSelect: 'none',
      textTransform: 'uppercase',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {priority}
    </div>
  );
}
