import React, { useState } from 'react';
import { ACCENT, TONE, TASK_STATUS_TONE, PRIORITY_TONE } from '../tokens.js';
import { tc, formatDate } from '../utils.js';
import { TrashIcon } from '../icons.jsx';
import { Avatar } from './ui.jsx';
import { ConfirmModal } from './Modals.jsx';

export function TaskRow({ task, onUpdate, onDelete, onEdit, disabled, selectMode, selected, onToggleSelect }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(task.title);
  const [confirm, setConfirm] = useState(false);
  const tone = tc(TASK_STATUS_TONE[task.status] || 'neutral');
  const priTone = tc(PRIORITY_TONE[task.priority] || 'neutral');
  const done = task.status === 'DONE';

  const cycleStatus = () => {
    const order = ['TODO', 'IN PROGRESS', 'DONE'];
    onUpdate(task.id, { status: order[(order.indexOf(task.status) + 1) % order.length] });
  };
  const commitTitle = () => {
    setEditingTitle(false);
    if (titleVal.trim() && titleVal.trim() !== task.title) onUpdate(task.id, { title: titleVal.trim() });
    else setTitleVal(task.title);
  };

  return (
    <>
      <div className="task-row" data-id={task.id}
        style={{ display: 'grid', gridTemplateColumns: '16px 28px 80px 1fr 120px 90px 70px 110px 60px', alignItems: 'center', gap: 12, padding: '14px 20px', borderTop: '1px solid #22262B' }}>
        {selectMode ? (
          <input type="checkbox" checked={!!selected} onChange={() => onToggleSelect(task.id)}
            style={{ accentColor: ACCENT, width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />
        ) : (
          <div className={disabled ? "" : "drag-handle"} style={{ color: disabled ? '#2C3138' : 'rgba(255, 255, 255, 0.6)', fontSize: 12, cursor: disabled ? 'default' : 'grab', userSelect: 'none', touchAction: 'none' }}>⋮⋮</div>
        )}
        <div onClick={cycleStatus} style={{ width: 22, height: 22, border: `1.5px solid ${tone}`, background: done ? tone : 'transparent', color: done ? '#0A0B0D' : tone, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, cursor: 'pointer' }}>
          {done ? '✓' : ''}
        </div>
        <div style={{ fontSize: 11, color: '#626873', letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums' }}>{task.id.slice(0, 8)}</div>
        {editingTitle ? (
          <input autoFocus value={titleVal} onChange={e => setTitleVal(e.target.value)} onBlur={commitTitle} onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') { setTitleVal(task.title); setEditingTitle(false); } }} style={{ background: '#0F1114', border: `1px solid ${ACCENT}`, color: '#E8EAED', fontSize: 14, fontWeight: 500, padding: '2px 6px', outline: 'none', width: '100%' }} />
        ) : (
          <div onDoubleClick={() => { setEditingTitle(true); setTitleVal(task.title); }} title="Dvaput klikni za edit" style={{ fontSize: 14, fontWeight: 500, color: done ? '#848B96' : '#E8EAED', textDecoration: done ? 'line-through' : 'none', textDecorationColor: '#626873', letterSpacing: '-0.005em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}>
            {task.title}
          </div>
        )}
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', color: tone, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, background: tone, borderRadius: '50%' }} />{task.status}
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: priTone }}>{task.priority}</div>
        <div style={{ fontSize: 12, color: '#848B96', fontVariantNumeric: 'tabular-nums' }}>{task.dueDate ? formatDate(task.dueDate) : '—'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          {task.owner ? <Avatar initials={task.owner} color={TONE.neutral} size={24} /> : <span style={{ color: '#626873', fontSize: 11 }}>—</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <button className="task-edit-btn" onClick={() => onEdit(task)} style={{ background: 'transparent', border: 'none', color: '#E8EAED', cursor: 'pointer', fontSize: 11, letterSpacing: '0.06em', padding: 0 }}>UREDI</button>
          <button onClick={() => setConfirm(true)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2, display: 'flex' }}><TrashIcon /></button>
        </div>
      </div>
      {confirm && <ConfirmModal message={`Obriši task "${task.title}"?`} onConfirm={() => { setConfirm(false); onDelete(task.id); }} onCancel={() => setConfirm(false)} />}
    </>
  );
}
