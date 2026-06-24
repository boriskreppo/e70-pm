import React, { useEffect, useRef, useState } from 'react';
import Sortable from 'sortablejs';
import { ACCENT, TONE, KANBAN_COLS } from '../tokens.js';
import { tc, effectiveStatus, daysLeft, formatDate } from '../utils.js';
import { PriorityChip, ProgressBar, TagChip, Avatar } from './ui.jsx';
import { ChevronLeft, ChevronRight } from '../icons.jsx';

function KanbanCard({ project, onClick }) {
  const status = effectiveStatus(project);
  const dl = daysLeft(project.deadline);
  const overdue = dl !== null && dl < 0;
  const ownerColor = project.ownerColor || ACCENT;
  const progressTone = status === 'ZAVRŠEN' ? 'cyan' : overdue ? 'magenta' : 'lime';
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const onMouseDown = (e) => {
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const onMouseUp = (e) => {
    const dx = Math.abs(e.clientX - dragStart.x);
    const dy = Math.abs(e.clientY - dragStart.y);
    if (dx < 5 && dy < 5) {
      onClick();
    }
  };

  return (
    <div
      className="kanban-card"
      data-id={project.id}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      style={{
        background: '#0C0E11',
        border: '1px solid #2C3138',
        padding: '12px 14px',
        cursor: 'grab',
        marginBottom: 8,
        transition: 'border-color 0.15s, background 0.15s'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#4A4F57';
        e.currentTarget.style.background = '#101216';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#2C3138';
        e.currentTarget.style.background = '#0C0E11';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <PriorityChip priority={project.priority} />
        <Avatar initials={project.owner} color={ownerColor} size={20} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#E8EAED', letterSpacing: '-0.01em', marginBottom: 10, lineHeight: 1.3 }}>
        {project.title}
      </div>
      <ProgressBar value={project.progress} tone={progressTone} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
        <div style={{ fontSize: 10, color: overdue ? TONE.magenta : '#848B96', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {formatDate(project.deadline)}
        </div>
        {project.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, overflow: 'hidden' }}>
            {project.tags.slice(0, 1).map(t => <TagChip key={t} tag={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ col, index, children, count, onCardDrop, collapsed, onToggleCollapse }) {
  const containerRef = useRef(null);
  const color = tc(col.tone);
  const onCardDropRef = useRef(onCardDrop);

  useEffect(() => {
    onCardDropRef.current = onCardDrop;
  }, [onCardDrop]);

  useEffect(() => {
    if (!containerRef.current) return;
    const sortable = Sortable.create(containerRef.current, {
      group: 'kanban',
      animation: 150,
      draggable: '.kanban-card',
      ghostClass: 'sortable-ghost',
      onEnd: (evt) => {
        const { item, to, from } = evt;
        
        // Revert SortableJS DOM move immediately so React handles it cleanly
        const childrenArr = Array.from(from.children).filter(el => el.classList.contains('kanban-card'));
        const oldIndex = evt.oldIndex;
        if (oldIndex !== undefined) {
          if (oldIndex < childrenArr.length) {
            from.insertBefore(item, childrenArr[oldIndex]);
          } else {
            from.appendChild(item);
          }
        }

        const projectId = item.getAttribute('data-id');
        const targetStatus = to.getAttribute('data-status');
        const sourceStatus = from.getAttribute('data-status');
        
        if (projectId && targetStatus && targetStatus !== sourceStatus) {
          onCardDropRef.current(projectId, targetStatus);
        }
      }
    });

    return () => {
      sortable.destroy();
    };
  }, []);

  if (collapsed) {
    return (
      <div className="kanban-col collapsed" onClick={onToggleCollapse}
        style={{
          borderRight: index < 3 ? '1px solid #22262B' : 'none',
          cursor: 'pointer',
          background: '#0B0C0E',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '20px 0',
          height: '100%',
          userSelect: 'none',
          transition: 'background 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#121418'}
        onMouseLeave={e => e.currentTarget.style.background = '#0B0C0E'}
        title="Klikni da proširiš kolonu"
      >
        <div style={{ color, marginBottom: 20 }}>
          <ChevronRight size={14} />
        </div>
        <div style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.16em',
          color,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          whiteSpace: 'nowrap'
        }}>
          <span>{col.key}</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#0A0B0D', background: color, padding: '2px 6px', fontVariantNumeric: 'tabular-nums' }}>
            {String(count).padStart(2, '0')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="kanban-col"
      style={{ borderRight: index < 3 ? '1px solid #22262B' : 'none', transition: 'background 0.15s' }}>
      <div style={{ padding: '16px 20px', borderBottom: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onToggleCollapse} style={{ background: 'transparent', border: 'none', color: '#626873', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color = color} onMouseLeave={e => e.currentTarget.style.color = '#626873'} title="Skupljanje kolone">
            <ChevronLeft size={14} />
          </button>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color }}>▌ {col.key}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#0A0B0D', background: color, padding: '2px 8px', fontVariantNumeric: 'tabular-nums' }}>
          {String(count).padStart(2, '0')}
        </span>
      </div>
      <div ref={containerRef} data-status={col.key} style={{ padding: '12px', minHeight: 'calc(100vh - 350px)' }}>
        {children}
      </div>
    </div>
  );
}

export function KanbanView({ projects, onSelectProject, onUpdateProject }) {
  const [collapsedCols, setCollapsedCols] = useState(new Set());

  const toggleCollapse = (colKey) => {
    setCollapsedCols(prev => {
      const next = new Set(prev);
      if (next.has(colKey)) {
        next.delete(colKey);
      } else {
        next.add(colKey);
      }
      return next;
    });
  };

  const handleCardDrop = (projectId, targetStatus) => {
    const project = projects.find(p => p.id === projectId);
    if (project && project.status !== targetStatus) {
      onUpdateProject({ ...project, status: targetStatus });
    }
  };

  const gridTemplateColumns = KANBAN_COLS.map(col => 
    collapsedCols.has(col.key) ? '48px' : '1fr'
  ).join(' ');

  return (
    <div className="kanban-wrap" style={{ display: 'grid', gridTemplateColumns, flex: 1, borderTop: '1px solid #22262B', minHeight: 'calc(100vh - 300px)' }}>
      {KANBAN_COLS.map((col, i) => {
        const colProjects = projects.filter(p => {
          const es = effectiveStatus(p);
          return col.key === 'AKTIVNO' ? (es === 'AKTIVNO' || es === 'USKORO') : es === col.key;
        });
        const isCollapsed = collapsedCols.has(col.key);
        return (
          <KanbanColumn
            key={col.key}
            col={col}
            index={i}
            count={colProjects.length}
            onCardDrop={handleCardDrop}
            collapsed={isCollapsed}
            onToggleCollapse={() => toggleCollapse(col.key)}
          >
            {colProjects.map(p => <KanbanCard key={p.id} project={p} onClick={() => onSelectProject(p.id)} />)}
            {colProjects.length === 0 && <div style={{ fontSize: 11, color: '#2A2E33', letterSpacing: '0.08em', padding: '24px 8px', textAlign: 'center' }}>PRAZNO</div>}
          </KanbanColumn>
        );
      })}
    </div>
  );
}
