import { TONE } from './tokens.js';

export function tc(name) { return TONE[name] || TONE.neutral; }

export function relativeTime(ts) {
  if (!ts) return '—';
  const d = Date.now() - ts, m = Math.floor(d / 60000);
  if (m < 1) return 'upravo';
  if (m < 60) return `pre ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `pre ${h} h`;
  return `pre ${Math.floor(h / 24)} d`;
}

export function formatDate(s) {
  if (!s) return '—';
  const d = new Date(s + 'T00:00:00');
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}.`;
}

export function daysLeft(s) {
  if (!s) return null;
  const t = new Date(); t.setHours(0,0,0,0);
  const d = new Date(s + 'T00:00:00');
  return Math.ceil((d - t) / 86400000);
}

export function effectiveStatus(p) {
  if (p.status === 'AKTIVNO' && p.deadline) {
    const dl = daysLeft(p.deadline);
    if (dl < 0) return 'PROBIJEN ROK';
    if (dl <= 3) return 'USKORO';
  }
  return p.status;
}

export function hexToRgba(hex, opacity) {
  if (!hex || typeof hex !== 'string') return hex;
  if (hex.startsWith('var(')) {
    const varName = hex.slice(4, -1);
    return `rgba(var(${varName}-rgb), ${opacity})`;
  }
  let c = hex.substring(1);
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
