import React, { useState, useEffect, useMemo, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Sortable from 'sortablejs';
import { ACCENT, TONE } from '../tokens.js';
import { effectiveStatus, daysLeft, formatDate, relativeTime, hexToRgba } from '../utils.js';
import { ChevronLeft, SearchIcon, TrashIcon, CheckIcon } from '../icons.jsx';
import { Avatar, StatusChip, PriorityChip, TagChip, MetaCell, Footer } from './ui.jsx';
import { TopBar } from './TopBar.jsx';
import { TaskRow } from './TaskRow.jsx';
import { TaskModal } from './Modals.jsx';
import { toast } from './Toast.jsx';
import { api } from '../api.js';
import { ActivityFeed } from './ActivityFeed.jsx';
import { AttachmentPanel } from './AttachmentPanel.jsx';

// ── Markdown config ──────────────────────────────────────────────────────────
marked.use({
  breaks: true,   // newline → <br> (prirodno za kratke beleške)
  gfm: true,      // GitHub-flavored: tabele, strikethrough, task liste
});

const ALLOWED_TAGS = ['h1','h2','h3','h4','p','strong','em','del','ul','ol','li','code','pre','blockquote','a','br','hr','table','thead','tbody','tr','th','td'];
const ALLOWED_ATTR = ['href','target','rel'];

function renderMarkdown(content) {
  const dirty = marked.parse(content || '');
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS, ALLOWED_ATTR });
}

// ── NoteItem ─────────────────────────────────────────────────────────────────
function NoteItem({ note, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal]     = useState(note.content);
  const [preview, setPreview]     = useState(false);

  const html = useMemo(() => renderMarkdown(note.content), [note.content]);

  const commit = () => {
    const v = editVal.trim();
    if (v && v !== note.content) onUpdate(note.id, v);
    setIsEditing(false);
    setPreview(false);
  };

  return (
    <div className="note-row" style={{ borderTop: '1px solid #22262B', padding: '14px 0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <div>
            {/* Toolbar: edit / preview toggle + markdown hints */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 0, border: '1px solid #2C3138' }}>
                {[['UREDI', false], ['PREGLED', true]].map(([label, val]) => (
                  <button key={label} onMouseDown={e => { e.preventDefault(); setPreview(val); }}
                    style={{ padding: '3px 10px', background: preview === val ? '#2C3138' : 'transparent', color: preview === val ? '#E8EAED' : '#626873', border: 'none', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 9, color: '#2A2E33', letterSpacing: '0.08em' }}>**bold** _italic_ `kod` # heading</span>
            </div>

            {preview ? (
              <div
                className="md-body"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(editVal) }}
                style={{ minHeight: 60, padding: '8px 10px', background: '#0A0B0D', border: '1px solid #2C3138', color: '#E8EAED', fontSize: 13, lineHeight: 1.6, cursor: 'default' }}
              />
            ) : (
              <textarea
                autoFocus
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                onBlur={commit}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setIsEditing(false); setPreview(false); }
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit();
                }}
                rows={4}
                style={{ width: '100%', background: '#0F1114', border: `1px solid ${ACCENT}`, color: '#E8EAED', fontSize: 13, padding: '6px 8px', resize: 'vertical', outline: 'none', lineHeight: 1.6, fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 6, justifyContent: 'flex-end' }}>
              <button onMouseDown={e => { e.preventDefault(); setIsEditing(false); setPreview(false); }}
                style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #2C3138', color: '#848B96', fontSize: 10, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.08em' }}>
                ODUSTANI
              </button>
              <button onMouseDown={e => { e.preventDefault(); commit(); }}
                style={{ padding: '4px 10px', background: ACCENT, color: '#0A0B0D', border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em' }}>
                SAČUVAJ
              </button>
            </div>
          </div>
        ) : (
          <div
            className="md-body"
            onDoubleClick={() => { setIsEditing(true); setEditVal(note.content); }}
            title="Dvaput klikni za edit"
            dangerouslySetInnerHTML={{ __html: html }}
            style={{ fontSize: 13, color: '#E8EAED', lineHeight: 1.6, cursor: 'text', minHeight: 20 }}
          />
        )}
        <div style={{ fontSize: 10, color: '#626873', marginTop: 6, letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}>{relativeTime(note.createdAt)}</div>
      </div>
      <button onClick={() => onDelete(note.id)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}>
        <TrashIcon size={12} />
      </button>
    </div>
  );
}

export function DetailView({ project, online, user, onLogout, onBack, onEdit, onArchive, onUpdateProject, onAddTask, onUpdateTask, onDeleteTask, onBulkUpdate, onBulkDelete, onAddNote, onUpdateNote, onDeleteNote, onReorder }) {
  const [noteInput, setNoteInput] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskQuery, setTaskQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);  // kept for compat, unused
  const [editingNoteVal, setEditingNoteVal] = useState('');   // kept for compat, unused
  const [sidebarTab, setSidebarTab] = useState('notes');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(project.title);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleSelect = id => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSelect = () => setSelectedIds(new Set());
  const exitSelectMode = () => { setSelectMode(false); clearSelect(); };

  const status = effectiveStatus(project);

  // Inject markdown styles once
  useEffect(() => {
    const id = 'md-body-styles';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = `
      .md-body { word-break: break-word; }
      .md-body h1, .md-body h2, .md-body h3 { color: #E8EAED; font-weight: 600; margin: 1em 0 0.4em; line-height: 1.25; }
      .md-body h1 { font-size: 18px; border-bottom: 1px solid #2C3138; padding-bottom: 6px; }
      .md-body h2 { font-size: 15px; }
      .md-body h3 { font-size: 13px; color: #9AA0A8; }
      .md-body p  { margin: 0 0 0.6em; }
      .md-body p:last-child { margin-bottom: 0; }
      .md-body ul, .md-body ol { margin: 0 0 0.6em 1.2em; padding: 0; }
      .md-body li { margin-bottom: 2px; }
      .md-body strong { color: #F5F6F7; font-weight: 600; }
      .md-body em { color: #9AA0A8; font-style: italic; }
      .md-body del { color: #626873; }
      .md-body code { font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace; font-size: 11px; background: #0F1114; border: 1px solid #2C3138; color: #C6F432; padding: 1px 5px; border-radius: 3px; }
      .md-body pre  { background: #0F1114; border: 1px solid #2C3138; padding: 10px 12px; overflow-x: auto; margin: 0 0 0.6em; border-radius: 2px; }
      .md-body pre code { background: transparent; border: none; padding: 0; color: #E8EAED; font-size: 12px; }
      .md-body blockquote { border-left: 3px solid #C6F432; margin: 0 0 0.6em; padding: 4px 0 4px 12px; color: #848B96; }
      .md-body a { color: #C6F432; text-decoration: underline; }
      .md-body a:hover { color: #E8EAED; }
      .md-body hr { border: none; border-top: 1px solid #2C3138; margin: 0.8em 0; }
      .md-body table { border-collapse: collapse; width: 100%; margin-bottom: 0.6em; font-size: 12px; }
      .md-body th, .md-body td { border: 1px solid #2C3138; padding: 5px 8px; text-align: left; }
      .md-body th { background: #0F1114; color: #9AA0A8; font-weight: 600; }
    `;
    document.head.appendChild(el);
  }, []);

  useEffect(() => {
    const handler = e => {
      const tag = e.target.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.key === 'e' || e.key === 'E') { e.preventDefault(); onEdit(); }
      if (e.key === 'Backspace') { e.preventDefault(); onBack(); }
      if ((e.key === 'd' || e.key === 'D') && status !== 'ZAVRŠEN') {
        e.preventDefault();
        onUpdateProject({ ...project, status: 'ZAVRŠEN' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [project, status]);
  const dl = daysLeft(project.deadline);
  const overdue = dl !== null && dl < 0;
  const ownerColor = project.ownerColor || ACCENT;

  const taskListRef = useRef(null);

  useEffect(() => {
    if (!taskListRef.current) return;
    const sortable = Sortable.create(taskListRef.current, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      disabled: !!taskQuery || selectMode,
      onEnd: (evt) => {
        const { oldIndex, newIndex, item, from } = evt;
        if (oldIndex === newIndex || oldIndex === undefined || newIndex === undefined) return;

        // Revert SortableJS DOM move immediately so React handles it cleanly
        const childrenArr = Array.from(from.children);
        if (oldIndex < childrenArr.length) {
          from.insertBefore(item, childrenArr[oldIndex]);
        } else {
          from.appendChild(item);
        }

        const ids = project.tasks.map(t => t.id);
        const activeId = ids[oldIndex];
        const overId = ids[newIndex];
        if (!activeId || !overId) return;

        const arrayMoveInPlace = (arr, fromIdx, toIdx) => {
          const element = arr[fromIdx];
          arr.splice(fromIdx, 1);
          arr.splice(toIdx, 0, element);
          return arr;
        };

        const newOrder = arrayMoveInPlace([...ids], oldIndex, newIndex);
        const reorderedTasks = arrayMoveInPlace([...project.tasks], oldIndex, newIndex);

        onReorder({ ...project, tasks: reorderedTasks });
        api(`/projects/${project.id}/tasks/reorder`, { method: 'PUT', body: JSON.stringify({ order: newOrder }) })
          .then(onReorder)
          .catch(e => toast(e.message, 'error'));
      }
    });

    return () => {
      sortable.destroy();
    };
  }, [project.tasks, taskQuery, selectMode, onReorder, project.id]);

  const filteredTasks = project.tasks.filter(t =>
    taskQuery === '' || t.title.toLowerCase().includes(taskQuery.toLowerCase()) ||
    t.status.toLowerCase().includes(taskQuery.toLowerCase()) ||
    t.priority.toLowerCase().includes(taskQuery.toLowerCase()) ||
    (t.owner || '').toLowerCase().includes(taskQuery.toLowerCase())
  );

  const tasksDone = project.tasks.filter(t => t.status === 'DONE').length;
  const tasksIP   = project.tasks.filter(t => t.status === 'IN PROGRESS').length;
  const tasksTodo = project.tasks.filter(t => t.status === 'TODO').length;
  const TCOLOR = { 'DONE': TONE.lime, 'IN PROGRESS': TONE.cyan, 'TODO': '#626873', 'BLOCKED': TONE.magenta };

  const breadcrumb = <><span>INTERNAL</span><span style={{ color: '#2A2E33' }}>/</span><span>PM</span><span style={{ color: '#2A2E33' }}>/</span><span style={{ color: '#E8EAED' }}>{project.id.slice(0,10).toUpperCase()}</span></>;

  return (
    <div style={{ minHeight: '100vh', background: '#08090B' }}>
      <TopBar breadcrumb={breadcrumb} right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="detail-topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {status !== 'ZAVRŠEN' && (
              <button onClick={() => onUpdateProject({ ...project, status: 'ZAVRŠEN' })} style={{ padding: '8px 14px', background: TONE.lime, color: '#0A0B0D', border: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <CheckIcon size={13} /> OZNAČI ZAVRŠENO
              </button>
            )}
            <button onClick={onEdit} style={{ padding: '8px 14px', background: 'transparent', color: '#E8EAED', border: '1px solid #2C3138', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', cursor: 'pointer' }}>UREDI · E</button>
            {onArchive && (
              <button onClick={() => onArchive(!project.archived)} title={project.archived ? 'Razarhiviraj projekat' : 'Arhiviraj projekat'}
                style={{ padding: '8px 14px', background: 'transparent', color: project.archived ? TONE.amber : '#848B96', border: '1px solid #2C3138', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', cursor: 'pointer' }}>
                {project.archived ? '↑ RAZARHIVIRAJ' : '⊘ ARHIVIRAJ'}
              </button>
            )}
          </div>
          <span style={{ color: '#2A2E33' }}>·</span>
          <span style={{ fontSize: 11, color: '#E8EAED', fontWeight: 600, letterSpacing: '0.1em' }}>{user?.username?.toUpperCase()}</span>
          <button onClick={onLogout} style={{ fontSize: 10, color: '#848B96', background: 'transparent', border: '1px solid #2C3138', padding: '3px 10px', cursor: 'pointer', letterSpacing: '0.1em', fontWeight: 600 }}>ODJAVA</button>
        </div>
      } online={online} />

      <div className="detail-pad" style={{ padding: '36px 28px 28px', borderBottom: '1px solid #22262B' }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: '#E8EAED', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', cursor: 'pointer', marginBottom: 12, padding: 0 }}>
          <ChevronLeft /> NAZAD NA PREGLED
        </button>

        <div className="mobile-detail-actions" style={{ display: 'none', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {status !== 'ZAVRŠEN' && (
            <button onClick={() => onUpdateProject({ ...project, status: 'ZAVRŠEN' })} style={{ padding: '9px 14px', background: TONE.lime, color: '#0A0B0D', border: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <CheckIcon size={12} /> ZAVRŠENO
            </button>
          )}
          <button onClick={onEdit} style={{ padding: '9px 14px', background: 'transparent', color: '#E8EAED', border: '1px solid #2C3138', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', cursor: 'pointer' }}>UREDI</button>
        </div>

        <div className="detail-meta-row" style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: '#848B96', marginBottom: 18 }}>
          <span style={{ color: '#626873' }}>{project.id.slice(0,10).toUpperCase()}</span>
          <span style={{ color: '#2A2E33' }}>·</span>
          <StatusChip status={status} />
          <span style={{ color: '#2A2E33' }}>·</span>
          <PriorityChip priority={project.priority} />
          {project.tags.length > 0 && <><span style={{ color: '#2A2E33' }}>·</span>{project.tags.map(t => <TagChip key={t} tag={t} />)}</>}
        </div>

        {editingTitle ? (
          <input autoFocus value={titleVal}
            onChange={e => setTitleVal(e.target.value)}
            onBlur={() => {
              setEditingTitle(false);
              if (titleVal.trim() && titleVal.trim() !== project.title)
                onUpdateProject({ ...project, title: titleVal.trim() });
              else setTitleVal(project.title);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') e.target.blur();
              if (e.key === 'Escape') { setTitleVal(project.title); setEditingTitle(false); }
            }}
            style={{ margin: 0, fontSize: 64, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1.0, color: '#F5F6F7', maxWidth: 900, width: '100%', background: 'transparent', border: 'none', borderBottom: `2px solid ${ACCENT}`, outline: 'none', padding: '0 0 4px 0', fontFamily: 'inherit' }}
          />
        ) : (
          <h1 className="detail-title" onDoubleClick={() => { setEditingTitle(true); setTitleVal(project.title); }}
            title="Dvaput klikni za edit"
            style={{ margin: 0, fontSize: 64, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1.0, color: '#F5F6F7', maxWidth: 900, cursor: 'text' }}>
            {project.title.split(' ').length > 3
              ? <>{project.title.split(' ').slice(0,-1).join(' ')}<br /><span style={{ color: ACCENT }}>{project.title.split(' ').slice(-1)[0]}.</span></>
              : <>{project.title}<span style={{ color: ACCENT }}>.</span></>}
          </h1>
        )}

        {project.description && <p style={{ marginTop: 20, marginBottom: 0, fontSize: 16, lineHeight: 1.55, color: '#9AA0A8', maxWidth: 720 }}>{project.description}</p>}
      </div>

      <div className="meta-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1px solid #22262B', background: '#0C0E11' }}>
        <MetaCell label="ROK" value={formatDate(project.deadline)} tone={overdue ? 'magenta' : 'amber'} mono isLast={false} />
        <MetaCell label="OSTALO" value={dl !== null ? (overdue ? `−${Math.abs(dl)}d` : `${dl}d`) : '—'} tone={overdue ? 'magenta' : 'amber'} isLast={false} />
        <MetaCell label="NAPREDAK" value={`${project.progress}%`} tone="lime" isLast={false} />
        <MetaCell label="TASKOVI" value={`${tasksDone} / ${project.tasks.length}`} tone="neutral" isLast={false} />
        <MetaCell label="BELEŠKE" value={String(project.notes.length)} tone="cyan" isLast />
      </div>

      <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 360px' }}>
        <div className="detail-left" style={{ borderRight: '1px solid #22262B' }}>
          <div className="progress-section" style={{ padding: '28px', borderBottom: '1px solid #22262B' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#848B96' }}>▌ NAPREDAK</div>
              <div className="progress-legend" style={{ display: 'flex', gap: 20, fontSize: 11, color: '#848B96', letterSpacing: '0.1em' }}>
                <span><span style={{ color: TONE.lime }}>●</span> ZAVRŠENO {tasksDone}</span>
                <span><span style={{ color: TONE.cyan }}>●</span> U TOKU {tasksIP}</span>
                <span><span style={{ color: '#626873' }}>●</span> ČEKA {tasksTodo}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 2, height: 8 }}>
              {project.tasks.length > 0
                ? project.tasks.map(t => <div key={t.id} style={{ flex: 1, background: TCOLOR[t.status] || '#626873' }} />)
                : <div style={{ flex: 1, background: '#2C3138' }} />}
            </div>
          </div>

          <div>
            <div className="tasks-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', gap: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#848B96' }}>▌ TASKOVI · {project.tasks.length}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => { setSelectMode(s => !s); clearSelect(); }}
                  style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: selectMode ? ACCENT : '#848B96', background: 'transparent', border: `1px solid ${selectMode ? hexToRgba(ACCENT, 0.25) : '#2C3138'}`, padding: '4px 10px', cursor: 'pointer' }}>
                  {selectMode ? 'IZLAZ' : 'SELEKTUJ'}
                </button>
                {!selectMode && <button onClick={() => setShowAddTask(true)} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#E8EAED', background: 'transparent', border: 'none', cursor: 'pointer' }}>+ DODAJ TASK</button>}
              </div>
            </div>

            {selectMode && filteredTasks.length > 0 && (
              <div style={{ padding: '6px 20px 8px', borderTop: '1px solid #22262B', display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
                <button onClick={() => setSelectedIds(new Set(filteredTasks.map(t => t.id)))} style={{ background: 'transparent', border: 'none', color: '#848B96', cursor: 'pointer', fontSize: 11, letterSpacing: '0.08em', padding: 0 }}>SVE</button>
                <button onClick={clearSelect} style={{ background: 'transparent', border: 'none', color: '#848B96', cursor: 'pointer', fontSize: 11, letterSpacing: '0.08em', padding: 0 }}>NIŠTA</button>
                {selectedIds.size > 0 && <span style={{ color: ACCENT, fontWeight: 600, letterSpacing: '0.08em' }}>{selectedIds.size} selektovano</span>}
              </div>
            )}

            <div className="task-search-bar" style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 10, background: '#0F1114', borderTop: '1px solid #22262B', borderBottom: '1px solid #22262B' }}>
              <span style={{ color: '#626873', paddingTop: 10 }}><SearchIcon /></span>
              <input value={taskQuery} onChange={e => setTaskQuery(e.target.value)} placeholder="Pretraži taskove..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#E8EAED', fontSize: 13, padding: '10px 0' }} />
              {taskQuery && <button onClick={() => setTaskQuery('')} style={{ background: 'transparent', border: 'none', color: '#848B96', cursor: 'pointer', fontSize: 16 }}>×</button>}
            </div>

            <div className="task-col-headers" style={{ display: 'grid', gridTemplateColumns: '16px 28px 80px 1fr 120px 90px 70px 110px 60px', gap: 12, padding: '8px 20px', fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', color: '#626873' }}>
              <div/><div/><div>ID</div><div>OPIS</div><div>STATUS</div><div>PRIORITET</div><div>ROK</div><div style={{ textAlign: 'right' }}>VLASNIK</div><div/>
            </div>

            {filteredTasks.length === 0 && (
              <div style={{ padding: '24px 20px', fontSize: 13, color: '#626873', letterSpacing: '0.04em', borderTop: '1px solid #22262B' }}>
                {taskQuery ? 'Nema rezultata.' : 'Nema taskova. Dodaj prvi task.'}
              </div>
            )}
            <div ref={taskListRef}>
              {filteredTasks.map(t => (
                <TaskRow key={t.id} task={t}
                  disabled={!!taskQuery || selectMode}
                  selectMode={selectMode}
                  selected={selectedIds.has(t.id)}
                  onToggleSelect={toggleSelect}
                  onUpdate={(id, data) => onUpdateTask(id, data)}
                  onDelete={(id) => onDeleteTask(id)}
                  onEdit={(task) => setEditingTask(task)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="sidebar-inner" style={{ padding: '28px', borderBottom: '1px solid #22262B' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#848B96', marginBottom: 16 }}>▌ VLASNIK</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar initials={project.owner} color={ownerColor} size={36} />
              <div>
                <div style={{ fontSize: 14, color: '#E8EAED', fontWeight: 500 }}>{project.owner || '—'}</div>
                <div style={{ fontSize: 10, color: '#848B96', letterSpacing: '0.1em', marginTop: 2 }}>OWNER</div>
              </div>
            </div>
          </div>

          <div className="sidebar-inner" style={{ padding: '0', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #22262B' }}>
              {[['notes', `BELEŠKE · ${project.notes.length}`], ['files', 'FAJLOVI'], ['activity', 'AKTIVNOST']].map(([key, label]) => (
                <button key={key} onClick={() => setSidebarTab(key)}
                  style={{ flex: 1, padding: '12px 6px', background: 'transparent', border: 'none', borderBottom: sidebarTab === key ? `2px solid ${ACCENT}` : '2px solid transparent', color: sidebarTab === key ? '#E8EAED' : '#848B96', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', cursor: 'pointer', marginBottom: -1 }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ padding: '20px 28px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {sidebarTab === 'notes' && <>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#848B96', marginBottom: 16 }}>▌ BELEŠKE · {project.notes.length}</div>
            <div style={{ marginBottom: 16 }}>
              <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { onAddNote(noteInput); setNoteInput(''); } }} rows={2} placeholder="Dodaj komentar..." style={{ width: '100%', background: '#0F1114', border: '1px solid #2C3138', color: '#E8EAED', fontSize: 13, padding: '10px 12px', resize: 'none', outline: 'none' }} />
              <button onClick={() => { if (noteInput.trim()) { onAddNote(noteInput); setNoteInput(''); } }} disabled={!noteInput.trim()} style={{ marginTop: 8, padding: '7px 14px', background: noteInput.trim() ? ACCENT : '#2C3138', color: noteInput.trim() ? '#0A0B0D' : '#626873', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ DODAJ</button>
            </div>
            {project.notes.map(note => (
              <NoteItem
                key={note.id}
                note={note}
                onUpdate={onUpdateNote}
                onDelete={onDeleteNote}
              />
            ))}

            </>}
            {sidebarTab === 'files' && <AttachmentPanel projectId={project.id} user={user} />}
            {sidebarTab === 'activity' && <ActivityFeed projectId={project.id} />}
            </div>
          </div>
        </div>
      </div>

      <Footer left={<><span style={{ color: ACCENT }}>● CONNECTED</span><span>· {project.id.slice(0,10).toUpperCase()}</span></>} />

      {showAddTask && <TaskModal onClose={() => setShowAddTask(false)} onSave={data => { onAddTask(data); setShowAddTask(false); }} projectId={project.id} user={user} />}
      {editingTask && <TaskModal initial={editingTask} onClose={() => setEditingTask(null)} onSave={data => { onUpdateTask(editingTask.id, data); setEditingTask(null); }} projectId={project.id} user={user} />}

      {selectMode && selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0F1114', border: '1px solid #2C3138', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'toastIn 0.18s ease' }}>
          <span style={{ fontSize: 11, color: '#848B96', letterSpacing: '0.08em', marginRight: 4 }}>{selectedIds.size} task{selectedIds.size !== 1 ? 'a' : ''}</span>
          {[['TODO', '#626873'], ['IN PROGRESS', '#22D3EE'], ['DONE', '#C6F432'], ['BLOCKED', '#FF3DAA']].map(([s, c]) => (
            <button key={s} onClick={async () => { await onBulkUpdate([...selectedIds], { status: s }); exitSelectMode(); }}
              style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${c}44`, color: c, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer' }}>{s}</button>
          ))}
          <div style={{ width: 1, height: 20, background: '#2C3138', margin: '0 4px' }} />
          <button onClick={async () => { await onBulkDelete([...selectedIds]); exitSelectMode(); }}
            style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer' }}>OBRIŠI</button>
          <button onClick={exitSelectMode}
            style={{ padding: '6px 10px', background: 'transparent', border: 'none', color: '#626873', fontSize: 14, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
      )}
    </div>
  );
}
