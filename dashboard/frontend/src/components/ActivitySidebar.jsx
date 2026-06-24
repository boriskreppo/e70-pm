import React from 'react';
import { relativeTime } from '../utils.js';
import { Avatar } from './ui.jsx';

export function ActivitySidebar({ activities, onClose, onSelectProject }) {
  return (
    <div className="activity-sidebar" style={{
      width: 340,
      background: '#0A0B0D',
      borderLeft: '1px solid #22262B',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      animation: 'toastIn 0.15s ease-out',
      zIndex: 10,
      flexShrink: 0
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px',
        borderBottom: '1px solid #22262B'
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', color: '#848B96' }}>▌ SKORAŠNJE AKTIVNOSTI</div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#848B96', fontSize: 18, cursor: 'pointer', padding: 0 }} onMouseEnter={e => e.currentTarget.style.color = '#F5F6F7'} onMouseLeave={e => e.currentTarget.style.color = '#848B96'}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {activities.length > 0 ? (
          activities.map((act) => {
            const dateText = relativeTime(act.created_at || act.createdAt);
            const userColor = act.user === 'sale' ? 'var(--accent-color)' : act.user === 'pero' ? '#FF3DAA' : '#22D3EE';
            return (
              <div
                key={act.id}
                onClick={() => {
                  if (act.project_id) onSelectProject(act.project_id);
                }}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '10px 12px',
                  background: '#0C0E11',
                  border: '1px solid #2C3138',
                  cursor: act.project_id ? 'pointer' : 'default',
                  transition: 'border-color 0.15s'
                }}
                onMouseEnter={e => {
                  if (act.project_id) e.currentTarget.style.borderColor = 'var(--accent-color)';
                }}
                onMouseLeave={e => {
                  if (act.project_id) e.currentTarget.style.borderColor = '#2C3138';
                }}
              >
                <Avatar initials={act.user ? act.user.substring(0, 3).toUpperCase() : '?'} color={userColor} size={22} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#E8EAED', lineHeight: 1.4, wordBreak: 'break-word' }}>
                    <span style={{ fontWeight: 600, color: userColor }}>{act.user}</span>{' '}
                    <span>{act.action}</span>{' '}
                    {act.details && <span style={{ color: '#848B96', fontStyle: 'italic' }}>({act.details})</span>}
                  </div>
                  <div style={{ fontSize: 9, color: '#626873', letterSpacing: '0.04em' }}>{dateText}</div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 12, color: '#626873', fontStyle: 'italic' }}>
            Nema skorašnjih aktivnosti.
          </div>
        )}
      </div>
    </div>
  );
}
