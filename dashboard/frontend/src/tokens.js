export const ACCENT = 'var(--accent-color)';
export const TONE = { lime: '#C6F432', cyan: '#22D3EE', magenta: '#FF3DAA', amber: '#F5A524', neutral: '#E8EAED' };
export const STATUS_TONE  = { 'AKTIVNO': 'lime', 'USKORO': 'amber', 'PROBIJEN ROK': 'magenta', 'ZAVRŠEN': 'cyan', 'PAUZIRAN': 'neutral' };
export const PRIORITY_TONE = { 'KRITIČAN': 'magenta', 'VISOK': 'amber', 'SREDNJI': 'cyan', 'NIZAK': 'neutral' };
export const TASK_STATUS_TONE = { 'DONE': 'lime', 'IN PROGRESS': 'cyan', 'TODO': 'neutral', 'BLOCKED': 'magenta' };
export const KANBAN_COLS = [
  { key: 'AKTIVNO',       tone: 'lime' },
  { key: 'PROBIJEN ROK',  tone: 'magenta' },
  { key: 'PAUZIRAN',      tone: 'neutral' },
  { key: 'ZAVRŠEN',       tone: 'cyan' },
];
export const APP_USERS = [
  { username: 'sale',  initials: 'SAL', color: ACCENT },
  { username: 'pero',  initials: 'PER', color: '#FF3DAA' },
  { username: 'boris', initials: 'BOR', color: '#22D3EE' },
];
