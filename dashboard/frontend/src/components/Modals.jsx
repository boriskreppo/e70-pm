import React, { useState, useEffect, useMemo } from 'react';
import { ACCENT, APP_USERS } from '../tokens.js';
import { TrashIcon } from '../icons.jsx';
import { Field, DarkInput, DarkTextarea, DarkSelect, TagInput, OwnerSelect, Avatar } from './ui.jsx';
import { relativeTime } from '../utils.js';
import { api } from '../api.js';
import { AttachmentPanel } from './AttachmentPanel.jsx';

export function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,9,11,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#0A0B0D', border: '1px solid #2C3138', padding: '32px', width: 380, maxWidth: '90vw' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#848B96', marginBottom: 16 }}>▌ POTVRDA</div>
        <div style={{ fontSize: 14, color: '#E8EAED', lineHeight: 1.6, marginBottom: 28 }}>{message}</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid #2C3138', color: '#E8EAED', fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.06em' }}>ODUSTANI</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '11px', background: '#EF4444', color: '#0A0B0D', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <TrashIcon size={14} /> OBRIŠI
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectModal({ onClose, onSave, initial, existingGroups = [] }) {
  const hasTasks = (initial?.tasks?.length || 0) > 0;
  const [form, setForm] = useState({
    title: initial?.title || '', description: initial?.description || '',
    deadline: initial?.deadline || '', status: initial?.status || 'AKTIVNO',
    priority: initial?.priority || 'SREDNJI', owner: initial?.owner || '',
    ownerColor: initial?.ownerColor || ACCENT,
    manualProgress: initial?.manualProgress ?? null,
    tags: initial?.tags || [],
    estimateSP: initial?.estimateSP ?? 2,
    groupName: initial?.groupName || (existingGroups[0] || 'Glavna grupa'),
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => { if (!form.title.trim()) return; onSave(initial ? { ...initial, ...form } : form); };

  // Group selector state
  const [groupOpen, setGroupOpen] = useState(false);
  const [newGroupInput, setNewGroupInput] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);

  // Merge existing groups ensuring Glavna grupa is always present
  const allGroups = Array.from(new Set(['Glavna grupa', ...existingGroups]));

  const handleGroupSelect = (g) => {
    set('groupName', g);
    setGroupOpen(false);
    setCreatingNew(false);
    setNewGroupInput('');
  };

  const handleCreateNew = () => {
    const name = newGroupInput.trim();
    if (!name) return;
    set('groupName', name);
    setGroupOpen(false);
    setCreatingNew(false);
    setNewGroupInput('');
  };

  // Group color hint
  const getHintColor = (name) => {
    const n = (name || '').toUpperCase();
    if (n.includes('DEEPVIEW')) return '#22D3EE';
    if (n.includes('INTERN')) return '#C6F432';
    if (n.includes('MARKET')) return '#F5A524';
    if (n.includes('INFRA')) return '#FF3DAA';
    if (n.includes('DESIGN')) return '#A78BFA';
    if (n.includes('PRODUK')) return '#F472B6';
    return ACCENT;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,9,11,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
      onClick={(e) => { if (e.target === e.currentTarget) { setGroupOpen(false); onClose(); } }}>
      <div className="modal-inner" style={{ background: '#0A0B0D', border: '1px solid #2C3138', width: 540, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #22262B', position: 'sticky', top: 0, background: '#0A0B0D', zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#848B96' }}>▌ {initial ? 'UREDI PROJEKAT' : 'NOVI PROJEKAT'}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#E8EAED', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Field label="NAZIV *"><DarkInput value={form.title} onChange={v => set('title', v)} placeholder="Naziv projekta..." autoFocus /></Field>

          {/* Group Selector */}
          <Field label="GLOBALNI PROJEKAT / GRUPA">
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setGroupOpen(o => !o); setCreatingNew(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: '#0F1114', border: '1px solid #2C3138',
                  color: '#E8EAED', fontSize: 13, cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'inherit'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: getHintColor(form.groupName), flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontWeight: 600 }}>{form.groupName}</span>
                </div>
                <span style={{ fontSize: 10, color: '#626873' }}>{groupOpen ? '▲' : '▼'}</span>
              </button>

              {groupOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  background: '#0F1114', border: '1px solid #2C3138', borderTop: 'none',
                  maxHeight: 220, overflowY: 'auto'
                }}>
                  {allGroups.map(g => (
                    <button
                      key={g}
                      onClick={() => handleGroupSelect(g)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', background: form.groupName === g ? '#1A1D24' : 'transparent',
                        border: 'none', borderBottom: '1px solid #1A1D24',
                        color: form.groupName === g ? '#E8EAED' : '#848B96',
                        fontSize: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                        fontWeight: form.groupName === g ? 700 : 400
                      }}
                      onMouseEnter={e => { if (form.groupName !== g) e.currentTarget.style.background = '#12141C'; }}
                      onMouseLeave={e => { if (form.groupName !== g) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: getHintColor(g), flexShrink: 0, display: 'inline-block' }} />
                      {g}
                      {form.groupName === g && <span style={{ marginLeft: 'auto', fontSize: 10, color: ACCENT }}>✓</span>}
                    </button>
                  ))}

                  {/* Divider */}
                  <div style={{ borderTop: '1px solid #2C3138', margin: '4px 0' }} />

                  {/* Create new group */}
                  {!creatingNew ? (
                    <button
                      onClick={() => setCreatingNew(true)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', background: 'transparent', border: 'none',
                        color: ACCENT, fontSize: 12, cursor: 'pointer', textAlign: 'left',
                        fontFamily: 'inherit', fontWeight: 600, letterSpacing: '0.05em'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#12141C'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      ＋ Kreiraj novu grupu
                    </button>
                  ) : (
                    <div style={{ padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        autoFocus
                        value={newGroupInput}
                        onChange={e => setNewGroupInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreateNew(); if (e.key === 'Escape') setCreatingNew(false); }}
                        placeholder="Naziv grupe..."
                        style={{
                          flex: 1, background: '#12141C', border: '1px solid #2C3138',
                          color: '#E8EAED', fontSize: 12, padding: '6px 10px',
                          outline: 'none', fontFamily: 'inherit'
                        }}
                      />
                      <button
                        onClick={handleCreateNew}
                        disabled={!newGroupInput.trim()}
                        style={{
                          padding: '6px 14px', background: newGroupInput.trim() ? ACCENT : '#2C3138',
                          color: newGroupInput.trim() ? '#0A0B0D' : '#626873',
                          border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          letterSpacing: '0.05em', fontFamily: 'inherit'
                        }}
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Field>

          <Field label="OPIS"><DarkTextarea value={form.description} onChange={v => set('description', v)} placeholder="Kratki opis..." /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="ROK"><DarkInput type="date" value={form.deadline} onChange={v => set('deadline', v)} /></Field>
            <Field label="STATUS"><DarkSelect value={form.status} onChange={v => set('status', v)} options={['AKTIVNO', 'PAUZIRAN', 'PROBIJEN ROK', 'ZAVRŠEN']} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="PRIORITET"><DarkSelect value={form.priority} onChange={v => set('priority', v)} options={['KRITIČAN', 'VISOK', 'SREDNJI', 'NIZAK']} /></Field>
            <Field label="VLASNIK"><OwnerSelect initials={form.owner} onChange={(initials, color) => { set('owner', initials); set('ownerColor', color); }} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
            <Field label="TAGOVI"><TagInput tags={form.tags} onChange={v => set('tags', v)} /></Field>
            <Field label="PROCJENA (SP)"><DarkInput type="number" min={0} max={40} value={form.estimateSP} onChange={v => set('estimateSP', parseInt(v) || 0)} /></Field>
          </div>
          {!hasTasks && (
            <Field label={`NAPREDAK % — ručno (${form.manualProgress ?? 0}%)`}>
              <input type="range" min={0} max={100} step={5} value={form.manualProgress ?? 0} onChange={e => set('manualProgress', Number(e.target.value))} style={{ width: '100%', accentColor: ACCENT }} />
            </Field>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, padding: '20px 24px', borderTop: '1px solid #22262B' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #2C3138', color: '#E8EAED', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>ODUSTANI</button>
          <button onClick={handleSave} disabled={!form.title.trim()} style={{ flex: 1, padding: '10px', background: form.title.trim() ? ACCENT : '#2C3138', color: form.title.trim() ? '#0A0B0D' : '#626873', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{initial ? 'SAČUVAJ' : 'KREIRAJ'}</button>
        </div>
      </div>
    </div>
  );
}


function userColor(username) {
  return APP_USERS.find(u => u.username === username)?.color || ACCENT;
}
function userInitials(username) {
  return APP_USERS.find(u => u.username === username)?.initials || username?.slice(0,3).toUpperCase() || '?';
}

export function TaskModal({ onClose, onSave, initial, projectId, user }) {
  const [form, setForm] = useState({ title: initial?.title || '', status: initial?.status || 'TODO', priority: initial?.priority || 'SREDNJI', owner: initial?.owner || '', dueDate: initial?.dueDate || '' });
  const [tab, setTab] = useState('form');
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isEdit = !!initial?.id;

  useEffect(() => {
    if (!isEdit || !projectId) return;
    api(`/projects/${projectId}/tasks/${initial.id}/comments`).then(setComments).catch(() => {});
  }, [isEdit, projectId, initial?.id]);

  const addComment = async () => {
    if (!commentInput.trim() || !projectId || !initial?.id) return;
    setSavingComment(true);
    try {
      const updated = await api(`/projects/${projectId}/tasks/${initial.id}/comments`, { method: 'POST', body: JSON.stringify({ content: commentInput.trim() }) });
      setComments(updated);
      setCommentInput('');
    } catch {} finally { setSavingComment(false); }
  };

  const deleteComment = async (cid) => {
    try {
      const updated = await api(`/projects/${projectId}/tasks/${initial.id}/comments/${cid}`, { method: 'DELETE' });
      setComments(updated);
    } catch {}
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,9,11,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div className="modal-inner" style={{ background: '#0A0B0D', border: '1px solid #2C3138', width: 460, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #22262B', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#848B96' }}>▌ {isEdit ? 'UREDI TASK' : 'NOVI TASK'}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#E8EAED', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        {isEdit && (
          <div style={{ display: 'flex', borderBottom: '1px solid #22262B', flexShrink: 0 }}>
            {[['form', 'UREDI'], ['comments', `KOMENTARI · ${comments.length}`], ['files', 'FAJLOVI']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: 'none', borderBottom: tab === key ? `2px solid ${ACCENT}` : '2px solid transparent', color: tab === key ? '#E8EAED' : '#848B96', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', cursor: 'pointer', marginBottom: -1 }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {tab === 'form' && (
          <>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
              <Field label="OPIS *"><DarkInput value={form.title} onChange={v => set('title', v)} placeholder="Šta treba uraditi..." autoFocus={!isEdit} /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="STATUS"><DarkSelect value={form.status} onChange={v => set('status', v)} options={['TODO', 'IN PROGRESS', 'DONE', 'BLOCKED']} /></Field>
                <Field label="PRIORITET"><DarkSelect value={form.priority} onChange={v => set('priority', v)} options={['KRITIČAN', 'VISOK', 'SREDNJI', 'NIZAK']} /></Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="VLASNIK"><OwnerSelect initials={form.owner} onChange={(initials) => set('owner', initials)} /></Field>
                <Field label="ROK"><DarkInput type="date" value={form.dueDate} onChange={v => set('dueDate', v)} /></Field>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, padding: '20px 24px', borderTop: '1px solid #22262B', flexShrink: 0 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #2C3138', color: '#E8EAED', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>ODUSTANI</button>
              <button onClick={() => { if (form.title.trim()) onSave({ ...form, dueDate: form.dueDate || null }); }} disabled={!form.title.trim()} style={{ flex: 1, padding: '10px', background: form.title.trim() ? ACCENT : '#2C3138', color: form.title.trim() ? '#0A0B0D' : '#626873', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{isEdit ? 'SAČUVAJ' : 'DODAJ'}</button>
            </div>
          </>
        )}

        {tab === 'files' && (
          <div style={{ flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <AttachmentPanel projectId={projectId} taskId={initial?.id} user={user} />
          </div>
        )}

        {tab === 'comments' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {comments.length === 0 ? (
                <div style={{ fontSize: 12, color: '#626873', textAlign: 'center', padding: '24px 0' }}>Nema komentara.</div>
              ) : comments.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingTop: i > 0 ? 12 : 0, marginTop: i > 0 ? 12 : 0, borderTop: i > 0 ? '1px solid #22262B' : 'none' }}>
                  <Avatar initials={userInitials(c.user)} color={userColor(c.user)} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: userColor(c.user) }}>{c.user}</span>
                      <span style={{ fontSize: 10, color: '#626873' }}>{relativeTime(c.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#E8EAED', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.content}</div>
                  </div>
                  {user?.username === c.user && (
                    <button onClick={() => deleteComment(c.id)} style={{ background: 'transparent', border: 'none', color: '#626873', cursor: 'pointer', padding: 2, flexShrink: 0 }}><TrashIcon size={11} /></button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #22262B', flexShrink: 0 }}>
              <textarea value={commentInput} onChange={e => setCommentInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addComment(); }}
                rows={2} placeholder="Dodaj komentar... (⌘+Enter da pošalješ)"
                style={{ width: '100%', background: '#0F1114', border: '1px solid #2C3138', color: '#E8EAED', fontSize: 13, padding: '8px 10px', resize: 'none', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid #2C3138', color: '#E8EAED', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ZATVORI</button>
                <button onClick={addComment} disabled={!commentInput.trim() || savingComment}
                  style={{ flex: 1, padding: '8px', background: commentInput.trim() ? ACCENT : '#2C3138', color: commentInput.trim() ? '#0A0B0D' : '#626873', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  POŠALJI
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CommandPalette({ onClose, projects, onNavigateProject, onExecuteCommand }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = useMemo(() => [
    { id: 'lista', label: 'Idi na prikaz: Lista', type: 'command', cmd: 'lista' },
    { id: 'kanban', label: 'Idi na prikaz: Kanban', type: 'command', cmd: 'kanban' },
    { id: 'gantt', label: 'Idi na prikaz: Gantt', type: 'command', cmd: 'gantt' },
    { id: 'novi', label: 'Kreiraj novi projekat', type: 'command', cmd: 'novi' },
    { id: 'pretraga', label: 'Fokusiraj pretragu', type: 'command', cmd: 'pretraga' },
    { id: 'filter-sve', label: 'Filter: Svi projekti', type: 'command', cmd: 'filter-sve' },
    { id: 'filter-aktivno', label: 'Filter: Aktivno', type: 'command', cmd: 'filter-aktivno' },
    { id: 'filter-uskoro', label: 'Filter: Ističe uskoro', type: 'command', cmd: 'filter-uskoro' },
    { id: 'filter-prekoraceno', label: 'Filter: Prekoračen rok', type: 'command', cmd: 'filter-prekoraceno' },
  ], []);

  const filteredOptions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return [...commands, ...projects.map(p => ({ id: `proj-${p.id}`, label: `Projekat: ${p.title}`, type: 'project', data: p.id }))];
    }
    
    let list = [];
    if (q.startsWith('/')) {
      const cmdPart = q.substring(1);
      list = commands.filter(c => c.cmd.includes(cmdPart) || c.label.toLowerCase().includes(cmdPart));
    } else {
      const cmdFiltered = commands.filter(c => c.label.toLowerCase().includes(q));
      const projFiltered = projects
        .filter(p => p.title.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)))
        .map(p => ({ id: `proj-${p.id}`, label: `Projekat: ${p.title}`, type: 'project', data: p.id }));
      list = [...cmdFiltered, ...projFiltered];
    }
    return list;
  }, [query, projects, commands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[selectedIndex]) {
        const option = filteredOptions[selectedIndex];
        if (option.type === 'command') {
          onExecuteCommand(option.cmd);
        } else {
          onNavigateProject(option.data);
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,9,11,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 150, paddingTop: '15vh' }} onClick={onClose}>
      <div style={{ background: '#0A0B0D', border: '1px solid #2C3138', width: 600, maxWidth: '95vw', display: 'flex', flexDirection: 'column', animation: 'toastIn 0.12s ease-out' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #22262B', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--accent-color)', fontSize: 13, fontWeight: 700 }}>&gt;</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Kucaj komandu (npr. /lista) ili naziv projekta..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#E8EAED', fontSize: 14 }}
            autoFocus
          />
        </div>
        <div style={{ maxHeight: 350, overflowY: 'auto' }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => {
              const active = idx === selectedIndex;
              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    if (opt.type === 'command') onExecuteCommand(opt.cmd);
                    else onNavigateProject(opt.data);
                  }}
                  style={{
                    padding: '12px 20px',
                    background: active ? '#16191D' : 'transparent',
                    borderBottom: '1px solid #0F1114',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span style={{ fontSize: 13, color: active ? '#F5F6F7' : '#E8EAED', fontWeight: active ? 600 : 400 }}>{opt.label}</span>
                  <span style={{ fontSize: 10, color: '#626873', letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}>
                    {opt.type === 'command' ? 'KOMANDA' : 'PROJEKAT'}
                  </span>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: '#626873' }}>
              Nema rezultata za "{query}"
            </div>
          )}
        </div>
        <div style={{ padding: '10px 20px', borderTop: '1px solid #22262B', fontSize: 9, color: '#626873', letterSpacing: '0.08em', display: 'flex', gap: 16 }}>
          <span>[↑↓] navigacija</span>
          <span>[Enter] odabir</span>
          <span>[Esc] zatvaranje</span>
          <span>[Tip] kucaj / za samo komande</span>
        </div>
      </div>
    </div>
  );
}
