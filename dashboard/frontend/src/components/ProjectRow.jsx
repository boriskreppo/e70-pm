import React, { useState } from 'react';
import { ACCENT, TONE, STATUS_TONE } from '../tokens.js';
import { effectiveStatus, daysLeft, formatDate, relativeTime, tc } from '../utils.js';
import { TrashIcon, ChevronRight, ChevronDown } from '../icons.jsx';
import { StatusChip, PriorityChip, TagChip, ProgressBar, Avatar, StatusBlock, PriorityBlock } from './ui.jsx';
import { ConfirmModal } from './Modals.jsx';

export function ProjectRow({ project, index, onClick, onDelete, onUpdateTask, onUpdateProject }) {
  const [confirm, setConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showSPMenu, setShowSPMenu] = useState(false);
  const [showDeadlineMenu, setShowDeadlineMenu] = useState(false);
  const [tempDeadline, setTempDeadline] = useState(project.deadline || '');
  const status = effectiveStatus(project);
  const dl = daysLeft(project.deadline);
  const overdue = dl !== null && dl < 0;
  const done = status === 'ZAVRŠEN';
  const progressTone = done ? 'cyan' : overdue ? 'magenta' : 'lime';
  const ownerColor = project.ownerColor || ACCENT;

  return (
    <>
      <div className="proj-row" data-id={project.id}
        style={{
          display: 'grid',
          gridTemplateColumns: '24px 24px 40px 1fr 60px 125px 125px 75px 120px 100px 110px 60px',
          alignItems: 'stretch',
          gap: 0,
          padding: 0,
          borderBottom: '1px solid #1C1F26',
          borderLeft: '4px solid ' + tc(STATUS_TONE[status] || 'neutral'),
          background: '#0B0D10',
          cursor: 'default',
          transition: 'background 0.15s ease',
          minHeight: 38
        }}>
        
        {/* Cell 1: Drag Handle */}
        <div className="drag-handle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1C1F26', color: 'rgba(255, 255, 255, 0.4)', fontSize: 11, cursor: 'grab', userSelect: 'none', touchAction: 'none' }}>
          ⋮⋮
        </div>
        
        {/* Cell 2: Expand Chevron */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1C1F26' }}>
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} style={{ background: 'transparent', border: 'none', color: '#848B96', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        </div>

        {/* Cell 3: ID */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1C1F26', fontSize: 10, fontWeight: 500, letterSpacing: '0.05em', color: '#626873', fontVariantNumeric: 'tabular-nums' }}>
          №{String(index + 1).padStart(3, '0')}
        </div>

        {/* Cell 4: Title & Info */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid #1C1F26', padding: '6px 12px', minWidth: 0, gap: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#F5F6F7', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 9, color: '#626873', letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>
              {project.tasks.filter(t => t.status === 'DONE').length}/{project.tasks.length} TSK
            </div>
            {project.tags.slice(0, 2).map(t => <TagChip key={t} tag={t} />)}
          </div>
        </div>
        
        {/* Cell 5: Owner */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1C1F26' }}>
          <Avatar initials={project.owner} color={ownerColor} size={22} />
        </div>

        {/* Cell 6: Status (Inline Dropdown) */}
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', borderRight: '1px solid #1C1F26', position: 'relative' }}>
          <div
            onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu); setShowPriorityMenu(false); setShowSPMenu(false); setShowDeadlineMenu(false); }}
            style={{ width: '100%', height: '100%', cursor: 'pointer' }}
          >
            <StatusBlock status={status} />
          </div>
          {showStatusMenu && (
            <>
              <div onClick={() => setShowStatusMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
              <div style={{
                position: 'absolute', top: '100%', left: 0,
                background: '#0A0B0D', border: '1px solid #2C3138',
                zIndex: 100, width: 160, marginTop: 4,
                boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                animation: 'toastIn 0.1s ease-out'
              }}>
                {[
                  { val: 'AKTIVNO',     color: '#C6F432', bg: '#0A150A' },
                  { val: 'USKORO',      color: '#F5A524', bg: '#15100A' },
                  { val: 'PAUZIRAN',    color: '#6B7280', bg: '#111317' },
                  { val: 'PROBIJEN ROK',color: '#FF3DAA', bg: '#150A0F' },
                  { val: 'ZAVRŠEN',     color: '#22D3EE', bg: '#0A1418' },
                ].map(({ val, color, bg }) => (
                  <div
                    key={val}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStatusMenu(false);
                      onUpdateProject({ ...project, status: val });
                    }}
                    style={{
                      padding: '9px 12px', fontSize: 10, fontWeight: 700,
                      color: status === val ? color : '#848B96',
                      background: status === val ? bg : 'transparent',
                      cursor: 'pointer', borderBottom: '1px solid #16191D',
                      letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8,
                      textTransform: 'uppercase', borderLeft: `3px solid ${status === val ? color : 'transparent'}`
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = bg}
                    onMouseLeave={e => e.currentTarget.style.background = status === val ? bg : 'transparent'}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block', animation: val === 'AKTIVNO' ? 'pulse 1.6s ease-out infinite' : 'none' }} />
                    {val}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Cell 7: Priority (Inline Menu) */}
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', borderRight: '1px solid #1C1F26', position: 'relative' }}>
          <div onClick={(e) => { e.stopPropagation(); setShowPriorityMenu(!showPriorityMenu); setShowStatusMenu(false); setShowSPMenu(false); setShowDeadlineMenu(false); }} style={{ width: '100%', height: '100%', cursor: 'pointer' }}>
            <PriorityBlock priority={project.priority} />
          </div>
          {showPriorityMenu && (
            <>
              <div onClick={() => setShowPriorityMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
              <div style={{
                position: 'absolute', top: '100%', left: 0,
                background: '#0A0B0D', border: '1px solid #2C3138',
                zIndex: 100, width: 140, marginTop: 4,
                boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                animation: 'toastIn 0.1s ease-out'
              }}>
                {[
                  { val: 'KRITIČAN', color: '#EF4444', bg: '#140808' },
                  { val: 'VISOK',    color: '#F97316', bg: '#140D06' },
                  { val: 'SREDNJI',  color: '#3B82F6', bg: '#080E1A' },
                  { val: 'NIZAK',    color: '#22C55E', bg: '#08150D' },
                ].map(({ val, color, bg }) => (
                  <div
                    key={val}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPriorityMenu(false);
                      onUpdateProject({ ...project, priority: val });
                    }}
                    style={{
                      padding: '9px 12px', fontSize: 10, fontWeight: 700,
                      color: project.priority === val ? color : '#848B96',
                      background: project.priority === val ? bg : 'transparent',
                      cursor: 'pointer', borderBottom: '1px solid #16191D',
                      letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8,
                      textTransform: 'uppercase', borderLeft: `3px solid ${project.priority === val ? color : 'transparent'}`
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = bg}
                    onMouseLeave={e => e.currentTarget.style.background = project.priority === val ? bg : 'transparent'}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    {val}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Cell 8: Story Points (SP - Inline Menu) */}
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', borderRight: '1px solid #1C1F26', position: 'relative' }}>
          <div
            onClick={(e) => { e.stopPropagation(); setShowSPMenu(!showSPMenu); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              background: '#111317',
              color: '#B2B9C4',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            {project.estimateSP ?? 2} SP
          </div>
          {showSPMenu && (
            <>
              <div onClick={() => setShowSPMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                background: '#0A0B0D',
                border: '1px solid #2C3138',
                zIndex: 100,
                width: 75,
                marginTop: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                animation: 'toastIn 0.1s ease-out'
              }}>
                {[1, 2, 3, 5, 8, 13].map(sp => (
                  <div
                    key={sp}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSPMenu(false);
                      onUpdateProject({ ...project, estimateSP: sp });
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: 10,
                      fontWeight: 600,
                      textAlign: 'center',
                      color: (project.estimateSP ?? 2) === sp ? 'var(--accent-color)' : '#E8EAED',
                      cursor: 'pointer',
                      borderBottom: '1px solid #22262B'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#16191D'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {sp} SP
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Cell 9: Napredak */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'stretch', borderRight: '1px solid #1C1F26', padding: '0 12px' }}>
          <div style={{ width: '100%' }}>
            <ProgressBar value={project.progress} tone={progressTone} />
          </div>
        </div>

        {/* Cell 10: Rok */}
        <div
          onClick={(e) => { e.stopPropagation(); setShowDeadlineMenu(!showDeadlineMenu); setTempDeadline(project.deadline || ''); }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            borderRight: '1px solid #1C1F26',
            padding: '0 8px',
            textAlign: 'center',
            gap: 1,
            position: 'relative',
            cursor: 'pointer',
            height: '100%'
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 500, color: overdue ? TONE.magenta : '#E8EAED', fontVariantNumeric: 'tabular-nums' }}>
            {formatDate(project.deadline) || '—'}
          </div>
          {dl !== null && status !== 'ZAVRŠEN' && (
            <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.04em', color: overdue ? TONE.magenta : '#848B96', fontVariantNumeric: 'tabular-nums' }}>
              {overdue ? `KAŠNJENJE ${Math.abs(dl)}d` : `OSTALO ${dl}d`}
            </div>
          )}

          {showDeadlineMenu && (
            <>
              <div onClick={(e) => { e.stopPropagation(); setShowDeadlineMenu(false); }} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#0A0B0D',
                  border: '1px solid #2C3138',
                  zIndex: 100,
                  width: 180,
                  marginTop: 4,
                  padding: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  animation: 'toastIn 0.1s ease-out'
                }}
              >
                <input
                  type="date"
                  value={tempDeadline}
                  onChange={(e) => setTempDeadline(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#111317',
                    border: '1px solid #2C3138',
                    color: '#E8EAED',
                    fontSize: 12,
                    padding: '4px 6px',
                    outline: 'none',
                    colorScheme: 'dark'
                  }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => {
                      onUpdateProject({ ...project, deadline: tempDeadline || null });
                      setShowDeadlineMenu(false);
                    }}
                    style={{
                      flex: 1,
                      background: 'var(--accent-color)',
                      color: '#0A0B0D',
                      border: 'none',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '5px 0',
                      cursor: 'pointer'
                    }}
                  >
                    SAČUVAJ
                  </button>
                  <button
                    onClick={() => {
                      onUpdateProject({ ...project, deadline: null });
                      setShowDeadlineMenu(false);
                    }}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: '1px solid #EF4444',
                      color: '#EF4444',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '5px 0',
                      cursor: 'pointer'
                    }}
                  >
                    UKLONI
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Cell 11: Aktivnost */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', borderRight: '1px solid #1C1F26', padding: '0 8px' }}>
          <Avatar initials={project.owner || '?'} color={ownerColor} size={16} />
          <div style={{ fontSize: 9, color: '#626873', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
            {relativeTime(project.updatedAt || project.createdAt)}
          </div>
        </div>

        {/* Cell 12: Akcije */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <button onClick={(e) => { e.stopPropagation(); setConfirm(true); }} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <TrashIcon />
          </button>
          <button onClick={onClick} style={{ background: 'transparent', border: 'none', color: '#626873', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color = ACCENT} onMouseLeave={e => e.currentTarget.style.color = '#626873'}>
            <ChevronRight />
          </button>
        </div>
      </div>
      
      {expanded && (
        <div style={{
          gridColumn: 'span 12',
          background: '#090A0D',
          borderTop: '1px solid #14161A',
          padding: '20px 28px 20px 132px',
          display: 'grid',
          gridTemplateColumns: '1fr 1.5fr',
          gap: 40,
          animation: 'toastIn 0.15s ease-out'
        }}>
          {/* Opis projekta */}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#555C66', marginBottom: 12 }}>OPIS PROJEKTA</div>
            {project.description ? (
              <div style={{ fontSize: 13, color: '#B2B9C4', lineHeight: 1.55, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
                {project.description}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#555C66', fontStyle: 'italic' }}>Nema opisa za ovaj projekat.</div>
            )}
          </div>

          {/* Podtaskovi */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#555C66', marginBottom: 12 }}>AKTIVNI TASKOVI ({project.tasks.length})</div>
            {project.tasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                {project.tasks.slice(0, 5).map(task => {
                  const done = task.status === 'DONE';
                  const taskTone = '#626873'; // minimalist neutral gray
                  
                  return (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid #14161A' }}>
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => {
                          const nextStatus = done ? 'TODO' : 'DONE';
                          onUpdateTask(project.id, task.id, { status: nextStatus });
                        }}
                        style={{ accentColor: ACCENT, width: 14, height: 14, cursor: 'pointer' }}
                      />
                      <span style={{
                        fontSize: 13,
                        color: done ? '#4A4F57' : '#B2B9C4',
                        textDecoration: done ? 'line-through' : 'none',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {task.title}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: taskTone }}>
                        {task.status}
                      </span>
                    </div>
                  );
                })}
                {project.tasks.length > 5 && (
                  <div onClick={onClick} style={{ fontSize: 11, color: ACCENT, cursor: 'pointer', marginTop: 4, fontWeight: 600 }}>
                    + prikaži još {project.tasks.length - 5} taskova...
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#555C66', fontStyle: 'italic' }}>Nema kreiranih taskova.</div>
            )}
          </div>
        </div>
      )}

      {confirm && <ConfirmModal message={`Obriši projekat "${project.title}"?`} onConfirm={() => { setConfirm(false); onDelete(project.id); }} onCancel={() => setConfirm(false)} />}
    </>
  );
}
