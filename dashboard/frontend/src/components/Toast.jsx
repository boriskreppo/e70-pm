import React, { useState, useEffect } from 'react';
import { TONE } from '../tokens.js';

let _addToast = null;
export function toast(message, type = 'ok') { if (_addToast) _addToast(message, type); }

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    _addToast = (message, type) => {
      const id = Date.now();
      setToasts(ts => [...ts, { id, message, type }]);
      setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3500);
    };
    return () => { _addToast = null; };
  }, []);

  const COLOR = { ok: TONE.lime, error: TONE.magenta, info: TONE.cyan };
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: '#0F1114', border: `1px solid ${COLOR[t.type] || TONE.lime}44`, color: '#E8EAED', fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 220, maxWidth: 340, boxShadow: '0 4px 24px rgba(0,0,0,0.4)', animation: 'toastIn 0.18s ease' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLOR[t.type] || TONE.lime, flexShrink: 0 }} />
          {t.message}
        </div>
      ))}
    </div>
  );
}
