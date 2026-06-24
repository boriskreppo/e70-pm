import React, { useState, useEffect, useRef } from 'react';
import { ACCENT, TONE, APP_USERS } from '../tokens.js';
import { relativeTime } from '../utils.js';
import { api } from '../api.js';
import { BellIcon } from '../icons.jsx';

function userColor(username) {
  return APP_USERS.find(u => u.username === username)?.color || ACCENT;
}

export function NotificationBell({ onSelectProject }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const ref = useRef(null);

  const load = () => {
    api('/notifications').then(d => {
      setUnread(d.unread);
      setItems(d.items);
    }).catch(() => {});
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllRead = async () => {
    await api('/notifications/read-all', { method: 'PUT' });
    setUnread(0);
    setItems(prev => prev.map(n => ({ ...n, read: 1 })));
  };

  const markRead = async (id) => {
    await api(`/notifications/${id}/read`, { method: 'PUT' });
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const handleClick = (item) => {
    if (!item.read) markRead(item.id);
    if (item.project_id && onSelectProject) {
      onSelectProject(item.project_id);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ position: 'relative', background: 'transparent', border: '1px solid #2C3138', color: open ? '#E8EAED' : '#848B96', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <BellIcon />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, background: TONE.magenta, color: '#0A0B0D', borderRadius: '50%', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', lineHeight: 1 }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320, background: '#0A0B0D', border: '1px solid #2C3138', zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #22262B' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#848B96' }}>NOTIFIKACIJE</span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 10, color: ACCENT, background: 'transparent', border: 'none', cursor: 'pointer', letterSpacing: '0.08em', fontWeight: 600 }}>OZNAČI SVE PROČITANO</button>
            )}
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ padding: '24px 16px', fontSize: 12, color: '#626873', textAlign: 'center' }}>Nema notifikacija.</div>
            ) : items.map((n, i) => (
              <div key={n.id} onClick={() => handleClick(n)}
                style={{ padding: '12px 16px', borderTop: i > 0 ? '1px solid #22262B' : 'none', display: 'flex', gap: 10, alignItems: 'flex-start', cursor: n.project_id ? 'pointer' : 'default', background: n.read ? 'transparent' : '#0F1114', transition: 'background 0.15s' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.read ? '#2A2E33' : TONE.cyan, flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: n.read ? '#848B96' : '#E8EAED', lineHeight: 1.45, marginBottom: 3 }}>{n.message}</div>
                  <div style={{ fontSize: 10, color: '#626873', letterSpacing: '0.06em' }}>{relativeTime(n.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
