import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ACCENT, TONE } from '../tokens.js';
import { effectiveStatus } from '../utils.js';
import { SearchIcon } from '../icons.jsx';
import { StatusChip } from './ui.jsx';

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: ACCENT + '44', color: ACCENT, padding: 0 }}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function GlobalSearch({ projects, onSelectProject, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { projects: [], tasks: [], notes: [] };

    const matchedProjects = projects.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    ).slice(0, 5);

    const matchedTasks = [];
    for (const p of projects) {
      for (const t of p.tasks) {
        if (t.title.toLowerCase().includes(q) || t.status.toLowerCase().includes(q)) {
          matchedTasks.push({ task: t, project: p });
          if (matchedTasks.length >= 5) break;
        }
      }
      if (matchedTasks.length >= 5) break;
    }

    const matchedNotes = [];
    for (const p of projects) {
      for (const n of p.notes) {
        if (n.content.toLowerCase().includes(q)) {
          matchedNotes.push({ note: n, project: p });
          if (matchedNotes.length >= 3) break;
        }
      }
      if (matchedNotes.length >= 3) break;
    }

    return { projects: matchedProjects, tasks: matchedTasks, notes: matchedNotes };
  }, [query, projects]);

  const total = results.projects.length + results.tasks.length + results.notes.length;
  const hasQuery = query.trim().length > 0;

  const ROW = { padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.1s' };
  const onHover = e => e.currentTarget.style.background = '#0F1114';
  const onLeave = e => e.currentTarget.style.background = 'transparent';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,9,11,0.88)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 300, paddingTop: '12vh' }}
      onClick={onClose}>
      <div style={{ width: 600, maxWidth: '92vw', background: '#0A0B0D', border: '1px solid #2C3138', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}>

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #22262B' }}>
          <span style={{ color: '#626873', flexShrink: 0 }}><SearchIcon /></span>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Pretraži projekte, taskove, beleške..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#E8EAED', fontSize: 14, letterSpacing: '-0.01em' }} />
          <kbd style={{ fontSize: 10, color: '#626873', border: '1px solid #2A2E33', padding: '2px 6px', letterSpacing: '0.06em' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {!hasQuery && (
            <div style={{ padding: '24px 16px', fontSize: 12, color: '#626873', letterSpacing: '0.08em', textAlign: 'center' }}>
              Počni da kucaš...
            </div>
          )}

          {hasQuery && total === 0 && (
            <div style={{ padding: '24px 16px', fontSize: 12, color: '#626873', letterSpacing: '0.08em', textAlign: 'center' }}>
              Nema rezultata za „{query}"
            </div>
          )}

          {results.projects.length > 0 && (
            <>
              <div style={{ padding: '8px 16px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: '#626873' }}>PROJEKTI</div>
              {results.projects.map(p => (
                <div key={p.id} style={ROW} onMouseEnter={onHover} onMouseLeave={onLeave}
                  onClick={() => { onSelectProject(p.id); onClose(); }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#E8EAED', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {highlight(p.title, query.trim())}
                    </div>
                    {p.description && (
                      <div style={{ fontSize: 11, color: '#626873', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {highlight(p.description, query.trim())}
                      </div>
                    )}
                  </div>
                  <StatusChip status={effectiveStatus(p)} />
                </div>
              ))}
            </>
          )}

          {results.tasks.length > 0 && (
            <>
              <div style={{ padding: '8px 16px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: '#626873', borderTop: results.projects.length > 0 ? '1px solid #22262B' : 'none', marginTop: results.projects.length > 0 ? 4 : 0 }}>TASKOVI</div>
              {results.tasks.map(({ task, project: p }) => (
                <div key={task.id} style={ROW} onMouseEnter={onHover} onMouseLeave={onLeave}
                  onClick={() => { onSelectProject(p.id); onClose(); }}>
                  <div style={{ width: 6, height: 6, border: `1.5px solid ${TONE.cyan}`, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#E8EAED', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {highlight(task.title, query.trim())}
                    </div>
                    <div style={{ fontSize: 11, color: '#626873', marginTop: 2 }}>{p.title}</div>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', color: TONE.cyan, flexShrink: 0 }}>{task.status}</div>
                </div>
              ))}
            </>
          )}

          {results.notes.length > 0 && (
            <>
              <div style={{ padding: '8px 16px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: '#626873', borderTop: (results.projects.length > 0 || results.tasks.length > 0) ? '1px solid #22262B' : 'none', marginTop: 4 }}>BELEŠKE</div>
              {results.notes.map(({ note, project: p }) => (
                <div key={note.id} style={ROW} onMouseEnter={onHover} onMouseLeave={onLeave}
                  onClick={() => { onSelectProject(p.id); onClose(); }}>
                  <div style={{ width: 6, height: 6, border: `1.5px solid ${TONE.amber}`, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: '#E8EAED', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {highlight(note.content, query.trim())}
                    </div>
                    <div style={{ fontSize: 11, color: '#626873', marginTop: 2 }}>{p.title}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid #22262B', display: 'flex', gap: 16, fontSize: 10, color: '#626873', letterSpacing: '0.08em' }}>
          <span><kbd style={{ border: '1px solid #2A2E33', padding: '1px 5px' }}>↵</kbd> otvori</span>
          <span><kbd style={{ border: '1px solid #2A2E33', padding: '1px 5px' }}>ESC</kbd> zatvori</span>
          {hasQuery && total > 0 && <span style={{ marginLeft: 'auto' }}>{total} rezultat{total !== 1 ? 'a' : ''}</span>}
        </div>
      </div>
    </div>
  );
}
