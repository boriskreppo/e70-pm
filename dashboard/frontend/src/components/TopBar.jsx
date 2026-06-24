import React from 'react';
import { ACCENT, TONE } from '../tokens.js';
import { hexToRgba } from '../utils.js';

export function TopBar({ breadcrumb, right, online }) {
  const now = new Date();
  const ds = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()} — ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  return (
    <div className="topbar-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 56, borderBottom: '1px solid #22262B', background: '#0A0B0D', position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 28, height: 28, background: ACCENT, color: '#0A0B0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, letterSpacing: '-0.04em', flexShrink: 0 }}>e70</div>
        <div className="topbar-breadcrumb" style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.16em', color: '#848B96', display: 'flex', alignItems: 'center', gap: 8 }}>{breadcrumb}</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', color: online ? ACCENT : TONE.magenta, padding: '3px 8px', border: `1px solid ${online ? hexToRgba(ACCENT, 0.2) : hexToRgba(TONE.magenta, 0.2)}`, background: online ? hexToRgba(ACCENT, 0.06) : hexToRgba(TONE.magenta, 0.06) }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: online ? ACCENT : TONE.magenta, animation: online ? 'pulse 1.6s ease-out infinite' : 'none' }} />
          {online ? 'LIVE' : 'OFFLINE'}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="topbar-date" style={{ fontSize: 11, color: '#848B96', letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}>{ds}</div>
        <span className="topbar-date" style={{ color: '#2A2E33' }}>·</span>
        {right}
      </div>
    </div>
  );
}
