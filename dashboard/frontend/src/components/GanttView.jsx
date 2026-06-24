import React, { useRef, useEffect, useMemo } from 'react';
import { ACCENT, TONE } from '../tokens.js';
import { effectiveStatus } from '../utils.js';
import { Avatar } from './ui.jsx';

const DAY_PX  = 26;
const ROW_H   = 54;
const HEAD_H  = 44;
const LEFT_W  = 230;

const STATUS_COLOR = {
  'AKTIVNO':      TONE.lime,
  'USKORO':       TONE.amber,
  'PROBIJEN ROK': TONE.magenta,
  'ZAVRŠEN':      TONE.cyan,
  'PAUZIRAN':     TONE.neutral,
};

function days(a, b) { return Math.round((b - a) / 86400000); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

export function GanttView({ projects, onSelectProject }) {
  const wrapRef = useRef(null);

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const { rangeStart, totalDays } = useMemo(() => {
    const pts = [];
    for (const p of projects) {
      pts.push(new Date(p.createdAt));
      if (p.deadline) pts.push(new Date(p.deadline + 'T00:00:00'));
    }
    pts.push(today);

    let lo = new Date(Math.min(...pts.map(d => d.getTime())));
    let hi = new Date(Math.max(...pts.map(d => d.getTime())));
    lo = addDays(lo, -21); lo.setDate(1);
    hi = addDays(hi,  21); hi.setMonth(hi.getMonth() + 1, 0);
    return { rangeStart: lo, totalDays: days(lo, hi) + 1 };
  }, [projects, today]);

  const totalPx = totalDays * DAY_PX;

  // scroll to today on mount
  useEffect(() => {
    if (!wrapRef.current) return;
    const todayOff = days(rangeStart, today) * DAY_PX;
    wrapRef.current.scrollLeft = todayOff - wrapRef.current.clientWidth / 2 + LEFT_W / 2;
  }, [rangeStart, today]);

  // month labels
  const months = useMemo(() => {
    const result = [];
    const d = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (true) {
      const x = days(rangeStart, d) * DAY_PX;
      if (x >= totalPx) break;
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const w = Math.min(days(d, next) * DAY_PX, totalPx - Math.max(0, x));
      result.push({ label: d.toLocaleDateString('sr-RS', { month: 'short', year: 'numeric' }), x: Math.max(0, x), w, odd: result.length % 2 === 1 });
      d.setMonth(d.getMonth() + 1);
    }
    return result;
  }, [rangeStart, totalPx]);

  const todayX = days(rangeStart, today) * DAY_PX;

  return (
    <div ref={wrapRef}
      style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, borderTop: '1px solid #22262B', minHeight: 'calc(100vh - 300px)' }}>
      <div style={{ width: LEFT_W + totalPx, minWidth: 'max-content', position: 'relative' }}>

        {/* ── Header row ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', height: HEAD_H, position: 'sticky', top: 0, zIndex: 10 }}>
          {/* Left cell */}
          <div style={{ width: LEFT_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 12, background: '#0A0B0D', borderRight: '1px solid #22262B', borderBottom: '1px solid #2C3138', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: '#626873' }}>PROJEKAT</span>
          </div>
          {/* Month labels */}
          <div style={{ position: 'relative', width: totalPx, background: '#0A0B0D', borderBottom: '1px solid #2C3138', flexShrink: 0 }}>
            {months.map((m, i) => (
              <div key={i} style={{ position: 'absolute', left: m.x, width: m.w, top: 0, bottom: 0, borderRight: '1px solid #22262B', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', color: '#626873', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{m.label}</span>
              </div>
            ))}
            {/* Today marker in header */}
            {todayX >= 0 && todayX <= totalPx && (
              <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 1, background: ACCENT, zIndex: 3 }} />
            )}
          </div>
        </div>

        {/* ── Project rows ────────────────────────────────────────────── */}
        {projects.map(p => {
          const status = effectiveStatus(p);
          const color  = STATUS_COLOR[status] || TONE.neutral;
          const ownerColor = p.ownerColor || ACCENT;

          const createdD = new Date(p.createdAt); createdD.setHours(0,0,0,0);
          const deadlineD = p.deadline ? new Date(p.deadline + 'T00:00:00') : null;

          const barLeft  = Math.max(0, days(rangeStart, createdD)) * DAY_PX;
          const barRight = deadlineD
            ? Math.min(totalPx, days(rangeStart, deadlineD) * DAY_PX)
            : Math.min(totalPx, todayX + DAY_PX * 14);
          const barW = Math.max(DAY_PX * 2, barRight - barLeft);

          return (
            <div key={p.id} style={{ display: 'flex', height: ROW_H, borderBottom: '1px solid #22262B' }}>
              {/* Left cell — sticky */}
              <div onClick={() => onSelectProject(p.id)}
                style={{ width: LEFT_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 5, background: '#08090B', borderRight: '1px solid #22262B', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', cursor: 'pointer', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#0F1114'}
                onMouseLeave={e => e.currentTarget.style.background = '#08090B'}>
                <Avatar initials={p.owner} color={ownerColor} size={22} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#E8EAED', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', color, marginTop: 2 }}>{status}</div>
                </div>
              </div>

              {/* Timeline cell */}
              <div onClick={() => onSelectProject(p.id)}
                style={{ position: 'relative', width: totalPx, flexShrink: 0, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#0F110A'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                {/* Alt month bands */}
                {months.filter(m => m.odd).map((m, i) => (
                  <div key={i} style={{ position: 'absolute', left: m.x, top: 0, bottom: 0, width: m.w, background: 'rgba(255,255,255,0.012)', pointerEvents: 'none' }} />
                ))}

                {/* Today line */}
                {todayX >= 0 && todayX <= totalPx && (
                  <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 1, background: ACCENT + '55', pointerEvents: 'none', zIndex: 2 }} />
                )}

                {/* Bar */}
                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: barLeft, width: barW, height: 26, background: color + '1A', border: `1px solid ${color}55`, overflow: 'hidden', zIndex: 3 }}>
                  {/* Progress fill */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p.progress}%`, background: color + '30' }} />
                  {/* Label */}
                  {barW > 52 && (
                    <span style={{ position: 'relative', fontSize: 9, fontWeight: 700, color, letterSpacing: '0.08em', padding: '0 8px', lineHeight: '26px', whiteSpace: 'nowrap' }}>
                      {p.progress}%
                    </span>
                  )}
                </div>

                {/* Deadline spike */}
                {deadlineD && (
                  <div style={{ position: 'absolute', left: barRight, top: '50%', transform: 'translateY(-50%)', width: 2, height: 34, background: color, zIndex: 4 }} />
                )}
              </div>
            </div>
          );
        })}

        {projects.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', fontSize: 11, letterSpacing: '0.14em', color: '#626873' }}>NEMA PROJEKATA</div>
        )}
      </div>
    </div>
  );
}
