import React, { useState, useEffect } from 'react';
import { ACCENT, TONE, APP_USERS } from '../tokens.js';
import { relativeTime } from '../utils.js';
import { api } from '../api.js';
import { Avatar } from './ui.jsx';

const ACTION_LABEL = {
  CREATE_PROJECT: 'Kreirao projekat',
  UPDATE_PROJECT: 'Izmijenio projekat',
  DELETE_PROJECT: 'Obrisao projekat',
  CREATE_TASK:    'Dodao task',
  UPDATE_TASK:    'Izmijenio task',
  DELETE_TASK:    'Obrisao task',
  CREATE_NOTE:      'Dodao belešku',
  UPDATE_NOTE:      'Izmijenio belešku',
  DELETE_NOTE:      'Obrisao belešku',
  ARCHIVE_PROJECT:   'Arhivirao projekat',
  UNARCHIVE_PROJECT: 'Razarhivirao projekat',
  ADD_ATTACHMENT:    'Dodao prilog',
  DELETE_ATTACHMENT: 'Obrisao prilog',
};

const ACTION_COLOR = {
  CREATE_PROJECT: TONE.lime,
  UPDATE_PROJECT: TONE.cyan,
  DELETE_PROJECT: TONE.magenta,
  CREATE_TASK:    TONE.lime,
  UPDATE_TASK:    TONE.cyan,
  DELETE_TASK:    TONE.magenta,
  CREATE_NOTE:      TONE.amber,
  UPDATE_NOTE:      TONE.amber,
  DELETE_NOTE:      TONE.magenta,
  ARCHIVE_PROJECT:   TONE.amber,
  UNARCHIVE_PROJECT: TONE.lime,
  ADD_ATTACHMENT:    TONE.cyan,
  DELETE_ATTACHMENT: TONE.magenta,
};

function userColor(username) {
  return APP_USERS.find(u => u.username === username)?.color || ACCENT;
}
function userInitials(username) {
  return APP_USERS.find(u => u.username === username)?.initials || username?.slice(0,3).toUpperCase() || '?';
}

function detail(entry) {
  const d = entry.details || {};
  if (d.title) return d.title.length > 40 ? d.title.slice(0, 40) + '…' : d.title;
  if (d.preview) return d.preview.length > 40 ? d.preview.slice(0, 40) + '…' : d.preview;
  return null;
}

export function ActivityFeed({ projectId, limit = 30 }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = projectId
      ? `/activity?project_id=${projectId}&limit=${limit}`
      : `/activity?limit=${limit}`;
    api(url).then(data => { setEntries(data); setLoading(false); }).catch(() => setLoading(false));
  }, [projectId, limit]);

  if (loading) return <div style={{ padding: '16px 0', fontSize: 11, color: '#626873', letterSpacing: '0.1em' }}>UČITAVANJE...</div>;
  if (entries.length === 0) return <div style={{ padding: '16px 0', fontSize: 12, color: '#626873' }}>Nema aktivnosti.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {entries.map((e, i) => {
        const color = ACTION_COLOR[e.action] || TONE.neutral;
        const det = detail(e);
        return (
          <div key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingTop: i > 0 ? 12 : 0, marginTop: i > 0 ? 12 : 0, borderTop: i > 0 ? '1px solid #22262B' : 'none' }}>
            <Avatar initials={userInitials(e.user)} color={userColor(e.user)} size={24} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#E8EAED', lineHeight: 1.4 }}>
                <span style={{ color: userColor(e.user), fontWeight: 600 }}>{e.user}</span>
                {' '}
                <span style={{ color: '#9AA0A8' }}>{ACTION_LABEL[e.action] || e.action}</span>
              </div>
              {det && (
                <div style={{ fontSize: 11, color: color, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {det}
                </div>
              )}
              <div style={{ fontSize: 10, color: '#626873', marginTop: 3, letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>
                {relativeTime(e.created_at)}
              </div>
            </div>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 }} />
          </div>
        );
      })}
    </div>
  );
}
