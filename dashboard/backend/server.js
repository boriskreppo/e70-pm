import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import archiver from 'archiver';
import { DatabaseSync } from 'node:sqlite';
import { createReadStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname, basename } from 'path';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.error('KRITIČNO: JWT_SECRET nije postavljen u .env fajlu!');
    process.exit(1);
  }
  return 'e70pm_jwt_secret_dev_only';
})();
const JWT_EXPIRY = '30d';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const UPLOADS_DIR = join(__dirname, 'uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new DatabaseSync(join(__dirname, 'dashboard.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Migration v1→v2: add priority/owner/owner_color/updated_at, normalize status values
// Idempotent: checks both the target column and the leftover _projects_v1 temp table
const existingCols = db.prepare('PRAGMA table_info(projects)').all().map(c => c.name);
const v1Exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_projects_v1'").get();

if (v1Exists && existingCols.includes('priority')) {
  // Rename happened but DROP didn't — clean up the leftover temp table
  db.exec('DROP TABLE _projects_v1');
  console.log('✓ Migracija baze: uklonjena preostala _projects_v1 tabela');
} else if (!existingCols.includes('priority')) {
  // Full migration needed
  db.exec(`
    ALTER TABLE projects RENAME TO _projects_v1;
    CREATE TABLE projects (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT DEFAULT '',
      deadline    TEXT,
      status      TEXT DEFAULT 'AKTIVNO',
      priority    TEXT DEFAULT 'SREDNJI',
      owner       TEXT DEFAULT '',
      owner_color TEXT DEFAULT '#C6F432',
      updated_at  INTEGER,
      created_at  INTEGER NOT NULL
    );
    INSERT INTO projects (id, title, description, deadline, status, priority, owner, owner_color, updated_at, created_at)
    SELECT id, title, description, deadline,
      CASE status WHEN 'active' THEN 'AKTIVNO' WHEN 'completed' THEN 'ZAVRŠEN' ELSE status END,
      'SREDNJI', '', '#C6F432', created_at, created_at
    FROM _projects_v1;
    DROP TABLE _projects_v1;
  `);
  console.log('✓ Migracija baze: v1 → v2');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title      TEXT NOT NULL,
    status     TEXT DEFAULT 'TODO',
    priority   TEXT DEFAULT 'SREDNJI',
    owner      TEXT DEFAULT '',
    due_date   TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);

  CREATE TABLE IF NOT EXISTS notes (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id);
`);

// Migration: add position to tasks
const taskCols = db.prepare('PRAGMA table_info(tasks)').all().map(c => c.name);
if (!taskCols.includes('position')) {
  db.exec('ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0');
  db.exec('UPDATE tasks SET position = rowid');
  console.log('✓ Migracija tasks: dodana position kolumna');
}

// Migration: add tags to projects
const projCols3 = db.prepare('PRAGMA table_info(projects)').all().map(c => c.name);
if (!projCols3.includes('tags')) {
  db.exec("ALTER TABLE projects ADD COLUMN tags TEXT DEFAULT '[]'");
  console.log('✓ Migracija projects: dodana tags kolumna');
}

// Migration: add manual_progress to projects
const projCols2 = db.prepare('PRAGMA table_info(projects)').all().map(c => c.name);
if (!projCols2.includes('manual_progress')) {
  db.exec('ALTER TABLE projects ADD COLUMN manual_progress INTEGER DEFAULT NULL');
  console.log('✓ Migracija projects: dodana manual_progress kolumna');
}

// Users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username     TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    display_name TEXT DEFAULT '',
    email        TEXT DEFAULT '',
    created_at   INTEGER NOT NULL
  );
`);

// Seed initial users if table is empty
const userCount = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
if (userCount === 0) {
  const seedPassword = process.env.SEED_PASSWORD || 'e70solutions';
  const seed = [
    { username: 'sale',  display_name: 'Sale',  email: '' },
    { username: 'pero',  display_name: 'Pero',  email: '' },
    { username: 'boris', display_name: 'Boris', email: '' },
  ];
  const hash = bcrypt.hashSync(seedPassword, 10);
  const ins = db.prepare('INSERT INTO users (username, password_hash, display_name, email, created_at) VALUES (?, ?, ?, ?, ?)');
  for (const u of seed) ins.run(u.username, hash, u.display_name, u.email, Date.now());
  console.log(`✓ Korisnici inicijalizovani (sale, pero, boris) — lozinka: ${seedPassword}`);
}

// Activity log table
db.exec(`
  CREATE TABLE IF NOT EXISTS activity (
    id         TEXT PRIMARY KEY,
    project_id TEXT,
    user       TEXT NOT NULL,
    action     TEXT NOT NULL,
    details    TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_activity_project ON activity(project_id);
  CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);
`);

// Notifications table
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id         TEXT PRIMARY KEY,
    user       TEXT NOT NULL,
    type       TEXT NOT NULL,
    project_id TEXT,
    message    TEXT NOT NULL,
    read       INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user, read);
`);

// Task comments table
db.exec(`
  CREATE TABLE IF NOT EXISTS task_notes (
    id         TEXT PRIMARY KEY,
    task_id    TEXT NOT NULL,
    project_id TEXT NOT NULL,
    user       TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_tasknotes_task ON task_notes(task_id);
`);

// Attachments table
db.exec(`
  CREATE TABLE IF NOT EXISTS attachments (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL,
    task_id       TEXT,
    original_name TEXT NOT NULL,
    stored_name   TEXT NOT NULL,
    size          INTEGER NOT NULL,
    mime_type     TEXT NOT NULL,
    uploader      TEXT NOT NULL,
    created_at    INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_att_project ON attachments(project_id);
  CREATE INDEX IF NOT EXISTS idx_att_task ON attachments(task_id);
`);

// Archived column on projects
const projCols4 = db.prepare('PRAGMA table_info(projects)').all().map(c => c.name);
if (!projCols4.includes('archived')) {
  db.exec('ALTER TABLE projects ADD COLUMN archived INTEGER DEFAULT 0');
  console.log('✓ Migracija projects: dodana archived kolona');
}

// Migration: add position to projects
const projCols5 = db.prepare('PRAGMA table_info(projects)').all().map(c => c.name);
if (!projCols5.includes('position')) {
  db.exec('ALTER TABLE projects ADD COLUMN position INTEGER DEFAULT 0');
  db.exec('UPDATE projects SET position = rowid');
  console.log('✓ Migracija projects: dodana position kolumna');
}

// Migration: add estimate_sp to projects
const projCols6 = db.prepare('PRAGMA table_info(projects)').all().map(c => c.name);
if (!projCols6.includes('estimate_sp')) {
  db.exec('ALTER TABLE projects ADD COLUMN estimate_sp INTEGER DEFAULT 2');
  console.log('✓ Migracija projects: dodana estimate_sp kolona');
}

// Migration: add group_name to projects
const projCols7 = db.prepare('PRAGMA table_info(projects)').all().map(c => c.name);
if (!projCols7.includes('group_name')) {
  db.exec("ALTER TABLE projects ADD COLUMN group_name TEXT DEFAULT 'Glavna grupa'");
  console.log('✓ Migracija projects: dodana group_name kolona');
}

console.log('✓ Baza inicijalizovana:', join(__dirname, 'dashboard.db'));

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ── Rate limiter: max 10 pokušaja / 15 min po IP-u ───────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Previše pokušaja prijave. Sačekaj 15 minuta.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Auth endpoints (public) ───────────────────────────────────────────────────
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  const u = (username || '').toLowerCase().trim();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(u);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka' });
  }
  const token = jwt.sign({ username: u }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  console.log(`✓ Prijava: ${u}`);
  res.json({ token, username: u, displayName: user.display_name, email: user.email });
});

app.post('/api/auth/logout', (req, res) => {
  // JWT je stateless — logout se radi brisanjem tokena na klijentu
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try {
      const { username } = jwt.verify(auth.slice(7), JWT_SECRET);
      console.log(`✓ Odjava: ${username}`);
    } catch {}
  }
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Nije autorizovan' });
  try {
    const { username } = jwt.verify(auth.slice(7), JWT_SECRET);
    res.json({ username });
  } catch {
    res.status(401).json({ error: 'Nevažeći token' });
  }
});

app.get('/api/auth/profile', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Nije autorizovan' });
  try {
    const { username } = jwt.verify(auth.slice(7), JWT_SECRET);
    const user = db.prepare('SELECT username, display_name, email, created_at FROM users WHERE username = ?').get(username);
    if (!user) return res.status(404).json({ error: 'Korisnik nije pronađen' });
    res.json({ username: user.username, displayName: user.display_name, email: user.email, createdAt: user.created_at });
  } catch { res.status(401).json({ error: 'Nevažeći token' }); }
});

app.put('/api/auth/profile', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Nije autorizovan' });
  try {
    const { username } = jwt.verify(auth.slice(7), JWT_SECRET);
    const { displayName, email } = req.body;
    db.prepare('UPDATE users SET display_name=?, email=? WHERE username=?').run(
      (displayName || '').trim(), (email || '').trim().toLowerCase(), username
    );
    const user = db.prepare('SELECT username, display_name, email, created_at FROM users WHERE username = ?').get(username);
    res.json({ username: user.username, displayName: user.display_name, email: user.email, createdAt: user.created_at });
  } catch { res.status(401).json({ error: 'Nevažeći token' }); }
});

app.post('/api/auth/change-password', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Nije autorizovan' });
  try {
    const { username } = jwt.verify(auth.slice(7), JWT_SECRET);
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Nova lozinka mora imati najmanje 6 karaktera' });
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!bcrypt.compareSync(currentPassword || '', user.password_hash)) {
      return res.status(401).json({ error: 'Trenutna lozinka nije ispravna' });
    }
    db.prepare('UPDATE users SET password_hash=? WHERE username=?').run(bcrypt.hashSync(newPassword, 10), username);
    console.log(`✓ Promjena lozinke: ${username}`);
    res.json({ success: true });
  } catch { res.status(401).json({ error: 'Nevažeći token' }); }
});

// ── File downloads (own auth — accepts ?token= so <a href> works) ────────────
function verifyDownloadToken(req) {
  const t = req.headers.authorization?.slice(7) || req.query.token;
  try { jwt.verify(t, JWT_SECRET); return true; } catch { return false; }
}

app.get('/api/attachments/:id/download', (req, res) => {
  if (!verifyDownloadToken(req)) return res.status(401).send('Neautorizovan');
  const att = db.prepare('SELECT * FROM attachments WHERE id=?').get(req.params.id);
  if (!att) return res.status(404).send('Fajl nije pronađen');
  const fp = join(UPLOADS_DIR, att.stored_name);
  if (!existsSync(fp)) return res.status(404).send('Fajl nije pronađen na disku');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(att.original_name)}`);
  res.setHeader('Content-Type', att.mime_type);
  createReadStream(fp).pipe(res);
});

app.get('/api/projects/:id/attachments/download-all', (req, res) => {
  if (!verifyDownloadToken(req)) return res.status(401).send('Neautorizovan');
  const atts = db.prepare('SELECT * FROM attachments WHERE project_id=? ORDER BY created_at DESC').all(req.params.id);
  if (!atts.length) return res.status(404).send('Nema fajlova');
  const proj = db.prepare('SELECT title FROM projects WHERE id=?').get(req.params.id);
  const zipName = `${(proj?.title || 'fajlovi').replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'_')}_fajlovi.zip`;
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(zipName)}`);
  res.setHeader('Content-Type', 'application/zip');
  const arc = archiver('zip', { zlib: { level: 6 } });
  arc.on('error', e => console.error('ZIP error:', e));
  arc.pipe(res);
  const seen = new Map();
  for (const att of atts) {
    const fp = join(UPLOADS_DIR, att.stored_name);
    if (!existsSync(fp)) continue;
    let name = att.original_name;
    const n = seen.get(name) || 0;
    if (n > 0) { const ext = extname(name); name = `${basename(name, ext)} (${n})${ext}`; }
    seen.set(att.original_name, n + 1);
    arc.file(fp, { name });
  }
  arc.finalize();
});

// ── Auth middleware (protects all /api/* except auth + health) ────────────────
const PUBLIC = ['/auth/login', '/auth/logout', '/health'];
app.use('/api', (req, res, next) => {
  if (PUBLIC.includes(req.path)) return next();
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Nije autorizovan' });
  try {
    const { username } = jwt.verify(auth.slice(7), JWT_SECRET);
    req.user = username;
    next();
  } catch {
    res.status(401).json({ error: 'Nevažeći ili istekao token' });
  }
});

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const BLOCKED_EXTS = new Set(['.exe','.bat','.sh','.cmd','.com','.msi','.ps1','.vbs','.app','.dmg','.deb','.rpm','.jar']);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (BLOCKED_EXTS.has(extname(file.originalname).toLowerCase())) return cb(new Error('Ovaj tip fajla nije dozvoljen'));
    cb(null, true);
  }
});

function doUpload(projectId, taskId, req, res) {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Fajl je prevelik (max 15MB)' : err.message });
    }
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Fajl je obavezan' });
    const project = db.prepare('SELECT id FROM projects WHERE id=?').get(projectId);
    if (!project) {
      try { unlinkSync(req.file.path); } catch {}
      return res.status(404).json({ error: 'Projekat nije pronađen' });
    }
    const id = uid('att');
    db.prepare('INSERT INTO attachments (id,project_id,task_id,original_name,stored_name,size,mime_type,uploader,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, projectId, taskId || null, req.file.originalname, req.file.filename, req.file.size, req.file.mimetype, req.user, Date.now());
    logActivity(req.user, 'ADD_ATTACHMENT', projectId, { name: req.file.originalname });
    const rows = taskId
      ? db.prepare('SELECT * FROM attachments WHERE project_id=? AND task_id=? ORDER BY created_at DESC').all(projectId, taskId)
      : db.prepare('SELECT * FROM attachments WHERE project_id=? AND task_id IS NULL ORDER BY created_at DESC').all(projectId);
    res.status(201).json(rows);
  });
}

const INITIALS_TO_USER = { 'SAL': 'sale', 'PER': 'pero', 'BOR': 'boris' };

function notify(username, type, projectId, message) {
  if (!username) return;
  try {
    db.prepare('INSERT INTO notifications (id, user, type, project_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uid('notif'), username, type, projectId || null, message, Date.now());
  } catch {}
}

function logActivity(user, action, projectId, details = {}) {
  try {
    db.prepare('INSERT INTO activity (id, project_id, user, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uid('a'), projectId || null, user, action, JSON.stringify(details), Date.now());
  } catch {}
}

function getProject(id) {
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!p) return null;
  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY position ASC, created_at ASC').all(id);
  const notes = db.prepare('SELECT * FROM notes WHERE project_id = ? ORDER BY created_at DESC').all(id);
  const doneTasks = tasks.filter(t => t.status === 'DONE').length;
  const autoProgress = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : null;
  const progress = autoProgress !== null ? autoProgress : (p.manual_progress ?? 0);
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    deadline: p.deadline,
    status: p.status,
    priority: p.priority,
    owner: p.owner,
    ownerColor: p.owner_color,
    manualProgress: p.manual_progress,
    tags: JSON.parse(p.tags || '[]'),
    estimateSP: p.estimate_sp ?? 2,
    groupName: p.group_name ?? 'Glavna grupa',
    progress,
    updatedAt: p.updated_at,
    createdAt: p.created_at,
    archived: !!p.archived,
    tasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      owner: t.owner,
      dueDate: t.due_date,
      createdAt: t.created_at,
    })),
    notes: notes.map(n => ({
      id: n.id,
      content: n.content,
      createdAt: n.created_at,
    })),
  };
}

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// ── Projects ─────────────────────────────────────────────────────────────────
app.get('/api/projects', (req, res) => {
  try {
    const archived = req.query.archived === '1' ? 1 : 0;
    const ids = db.prepare('SELECT id FROM projects WHERE archived=? ORDER BY position ASC, created_at DESC').all(archived);
    res.json(ids.map(r => getProject(r.id)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', (req, res) => {
  try {
    const p = getProject(req.params.id);
    if (!p) return res.status(404).json({ error: 'Projekat nije pronađen' });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', (req, res) => {
  try {
    const { title, description = '', deadline = null, status = 'AKTIVNO', priority = 'SREDNJI', owner = '', ownerColor = '#C6F432', manualProgress = null, tags = [], estimateSP = 2, groupName = 'Glavna grupa' } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Naslov je obavezan' });
    const id = uid('p');
    const now = Date.now();
    db.prepare(`
      INSERT INTO projects (id, title, description, deadline, status, priority, owner, owner_color, manual_progress, tags, estimate_sp, group_name, updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title.trim(), description, deadline, status, priority, owner, ownerColor, manualProgress, JSON.stringify(tags), estimateSP, groupName, now, now);
    logActivity(req.user, 'CREATE_PROJECT', id, { title: title.trim() });
    res.status(201).json(getProject(id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Projekat nije pronađen' });
    const { title, description, deadline, status, priority, owner, ownerColor, manualProgress, tags, estimateSP, groupName } = req.body;
    db.prepare(`
      UPDATE projects SET title=?, description=?, deadline=?, status=?, priority=?, owner=?, owner_color=?, manual_progress=?, tags=?, estimate_sp=?, group_name=?, updated_at=?
      WHERE id=?
    `).run(
      title ?? existing.title,
      description ?? existing.description,
      deadline !== undefined ? deadline : existing.deadline,
      status ?? existing.status,
      priority ?? existing.priority,
      owner ?? existing.owner,
      ownerColor ?? existing.owner_color,
      manualProgress !== undefined ? manualProgress : existing.manual_progress,
      tags !== undefined ? JSON.stringify(tags) : existing.tags,
      estimateSP !== undefined ? estimateSP : (existing.estimate_sp ?? 2),
      groupName !== undefined ? groupName : (existing.group_name ?? 'Glavna grupa'),
      Date.now(),
      req.params.id
    );
    logActivity(req.user, 'UPDATE_PROJECT', req.params.id, { title: title ?? existing.title, status: status ?? existing.status });
    res.json(getProject(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT title FROM projects WHERE id = ?').get(req.params.id);
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Projekat nije pronađen' });
    logActivity(req.user, 'DELETE_PROJECT', req.params.id, { title: existing?.title });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/reorder', (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order mora biti niz' });
    const stmt = db.prepare('UPDATE projects SET position=? WHERE id=?');
    order.forEach((projId, idx) => stmt.run(idx, projId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Tasks ────────────────────────────────────────────────────────────────────
app.put('/api/projects/:id/tasks/reorder', (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order mora biti niz' });
    const stmt = db.prepare('UPDATE tasks SET position=? WHERE id=? AND project_id=?');
    order.forEach((taskId, idx) => stmt.run(idx, taskId, req.params.id));
    db.prepare('UPDATE projects SET updated_at=? WHERE id=?').run(Date.now(), req.params.id);
    res.json(getProject(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/projects/:id/tasks/bulk', (req, res) => {
  try {
    const { ids, data } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids mora biti neprazan niz' });
    const sets = []; const params = [];
    if (data?.status !== undefined) { sets.push('status=?'); params.push(data.status); }
    if (data?.priority !== undefined) { sets.push('priority=?'); params.push(data.priority); }
    if (sets.length === 0) return res.status(400).json({ error: 'Nema podataka za update' });
    const stmt = db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id=? AND project_id=?`);
    for (const id of ids) stmt.run(...params, id, req.params.id);
    db.prepare('UPDATE projects SET updated_at=? WHERE id=?').run(Date.now(), req.params.id);
    res.json(getProject(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/projects/:id/tasks/bulk-delete', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids mora biti neprazan niz' });
    const stmt = db.prepare('DELETE FROM tasks WHERE id=? AND project_id=?');
    for (const id of ids) stmt.run(id, req.params.id);
    db.prepare('UPDATE projects SET updated_at=? WHERE id=?').run(Date.now(), req.params.id);
    res.json(getProject(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/projects/:id/tasks', (req, res) => {
  try {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Projekat nije pronađen' });
    const { title, status = 'TODO', priority = 'SREDNJI', owner = '', dueDate = null } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Naslov taska je obavezan' });
    const id = uid('t');
    db.prepare(`
      INSERT INTO tasks (id, project_id, title, status, priority, owner, due_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, title.trim(), status, priority, owner, dueDate, Date.now());
    db.prepare('UPDATE projects SET updated_at=? WHERE id=?').run(Date.now(), req.params.id);
    logActivity(req.user, 'CREATE_TASK', req.params.id, { title: title.trim(), owner });
    if (owner) {
      const ownerUser = INITIALS_TO_USER[owner];
      if (ownerUser && ownerUser !== req.user) {
        const proj = db.prepare('SELECT title FROM projects WHERE id=?').get(req.params.id);
        notify(ownerUser, 'TASK_ASSIGNED', req.params.id, `Dodjeljen ti je novi task "${title.trim()}" na projektu "${proj?.title}"`);
      }
    }
    res.status(201).json(getProject(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:id/tasks/:taskId', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(req.params.taskId, req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task nije pronađen' });
    const { title, status, priority, owner, dueDate } = req.body;
    db.prepare(`
      UPDATE tasks SET title=?, status=?, priority=?, owner=?, due_date=? WHERE id=?
    `).run(
      title ?? existing.title,
      status ?? existing.status,
      priority ?? existing.priority,
      owner ?? existing.owner,
      dueDate !== undefined ? dueDate : existing.due_date,
      req.params.taskId
    );
    db.prepare('UPDATE projects SET updated_at=? WHERE id=?').run(Date.now(), req.params.id);
    const updTitle = title ?? existing.title;
    const updStatus = status ?? existing.status;
    const newOwner = owner ?? existing.owner;
    logActivity(req.user, 'UPDATE_TASK', req.params.id, { title: updTitle, status: updStatus });
    if (newOwner && newOwner !== existing.owner) {
      const ownerUser = INITIALS_TO_USER[newOwner];
      if (ownerUser && ownerUser !== req.user) {
        const proj = db.prepare('SELECT title FROM projects WHERE id=?').get(req.params.id);
        notify(ownerUser, 'TASK_ASSIGNED', req.params.id, `Dodjeljen ti je task "${updTitle}" na projektu "${proj?.title}"`);
      }
    }
    res.json(getProject(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id/tasks/:taskId', (req, res) => {
  try {
    const existing = db.prepare('SELECT title FROM tasks WHERE id = ? AND project_id = ?').get(req.params.taskId, req.params.id);
    const result = db.prepare('DELETE FROM tasks WHERE id = ? AND project_id = ?').run(req.params.taskId, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Task nije pronađen' });
    db.prepare('UPDATE projects SET updated_at=? WHERE id=?').run(Date.now(), req.params.id);
    logActivity(req.user, 'DELETE_TASK', req.params.id, { title: existing?.title });
    res.json(getProject(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Notes ────────────────────────────────────────────────────────────────────
app.post('/api/projects/:id/notes', (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Sadržaj je obavezan' });
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Projekat nije pronađen' });
    const id = uid('n');
    db.prepare('INSERT INTO notes (id, project_id, content, created_at) VALUES (?, ?, ?, ?)').run(id, req.params.id, content.trim(), Date.now());
    db.prepare('UPDATE projects SET updated_at=? WHERE id=?').run(Date.now(), req.params.id);
    logActivity(req.user, 'CREATE_NOTE', req.params.id, { preview: content.trim().slice(0, 60) });
    res.status(201).json(getProject(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:projectId/notes/:noteId', (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Sadržaj je obavezan' });
    const result = db.prepare('UPDATE notes SET content=? WHERE id=? AND project_id=?').run(content.trim(), req.params.noteId, req.params.projectId);
    if (result.changes === 0) return res.status(404).json({ error: 'Beleška nije pronađena' });
    db.prepare('UPDATE projects SET updated_at=? WHERE id=?').run(Date.now(), req.params.projectId);
    res.json(getProject(req.params.projectId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:projectId/notes/:noteId', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM notes WHERE id = ? AND project_id = ?').run(req.params.noteId, req.params.projectId);
    if (result.changes === 0) return res.status(404).json({ error: 'Beleška nije pronađena' });
    res.json(getProject(req.params.projectId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Activity ──────────────────────────────────────────────────────────────────
app.get('/api/activity', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const pid = req.query.project_id;
    const rows = pid
      ? db.prepare('SELECT * FROM activity WHERE project_id=? ORDER BY created_at DESC LIMIT ?').all(pid, limit)
      : db.prepare('SELECT * FROM activity ORDER BY created_at DESC LIMIT ?').all(limit);
    res.json(rows.map(r => ({ ...r, details: JSON.parse(r.details || '{}') })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Notifications ─────────────────────────────────────────────────────────────
app.get('/api/notifications', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM notifications WHERE user=? ORDER BY created_at DESC LIMIT 50').all(req.user);
    const unread = db.prepare('SELECT COUNT(*) as n FROM notifications WHERE user=? AND read=0').get(req.user).n;
    res.json({ unread, items: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/notifications/read-all', (req, res) => {
  try {
    db.prepare('UPDATE notifications SET read=1 WHERE user=?').run(req.user);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/notifications/:id/read', (req, res) => {
  try {
    db.prepare('UPDATE notifications SET read=1 WHERE id=? AND user=?').run(req.params.id, req.user);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Archive ───────────────────────────────────────────────────────────────────
app.patch('/api/projects/:id/archive', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM projects WHERE id=?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Projekat nije pronađen' });
    const archived = req.body.archived ? 1 : 0;
    db.prepare('UPDATE projects SET archived=?, updated_at=? WHERE id=?').run(archived, Date.now(), req.params.id);
    logActivity(req.user, archived ? 'ARCHIVE_PROJECT' : 'UNARCHIVE_PROJECT', req.params.id, {});
    res.json(getProject(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Task comments ─────────────────────────────────────────────────────────────
app.get('/api/projects/:pid/tasks/:taskId/comments', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM task_notes WHERE task_id=? AND project_id=? ORDER BY created_at ASC').all(req.params.taskId, req.params.pid);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/projects/:pid/tasks/:taskId/comments', (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Sadržaj je obavezan' });
    const task = db.prepare('SELECT id FROM tasks WHERE id=? AND project_id=?').get(req.params.taskId, req.params.pid);
    if (!task) return res.status(404).json({ error: 'Task nije pronađen' });
    const id = uid('tc');
    db.prepare('INSERT INTO task_notes (id, task_id, project_id, user, content, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.params.taskId, req.params.pid, req.user, content.trim(), Date.now());
    const rows = db.prepare('SELECT * FROM task_notes WHERE task_id=? AND project_id=? ORDER BY created_at ASC').all(req.params.taskId, req.params.pid);
    res.status(201).json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/projects/:pid/tasks/:taskId/comments/:commentId', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM task_notes WHERE id=? AND task_id=? AND project_id=?').run(req.params.commentId, req.params.taskId, req.params.pid);
    if (result.changes === 0) return res.status(404).json({ error: 'Komentar nije pronađen' });
    const rows = db.prepare('SELECT * FROM task_notes WHERE task_id=? AND project_id=? ORDER BY created_at ASC').all(req.params.taskId, req.params.pid);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Attachments ───────────────────────────────────────────────────────────────
app.post('/api/projects/:id/attachments', (req, res) => doUpload(req.params.id, null, req, res));
app.post('/api/projects/:pid/tasks/:taskId/attachments', (req, res) => doUpload(req.params.pid, req.params.taskId, req, res));

app.get('/api/projects/:id/attachments', (req, res) => {
  try {
    const { task_id } = req.query;
    const rows = task_id
      ? db.prepare('SELECT * FROM attachments WHERE project_id=? AND task_id=? ORDER BY created_at DESC').all(req.params.id, task_id)
      : db.prepare('SELECT * FROM attachments WHERE project_id=? AND task_id IS NULL ORDER BY created_at DESC').all(req.params.id);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/attachments/:id', (req, res) => {
  try {
    const att = db.prepare('SELECT * FROM attachments WHERE id=?').get(req.params.id);
    if (!att) return res.status(404).json({ error: 'Fajl nije pronađen' });
    try { unlinkSync(join(UPLOADS_DIR, att.stored_name)); } catch {}
    db.prepare('DELETE FROM attachments WHERE id=?').run(req.params.id);
    logActivity(req.user, 'DELETE_ATTACHMENT', att.project_id, { name: att.original_name });
    const rows = att.task_id
      ? db.prepare('SELECT * FROM attachments WHERE project_id=? AND task_id=? ORDER BY created_at DESC').all(att.project_id, att.task_id)
      : db.prepare('SELECT * FROM attachments WHERE project_id=? AND task_id IS NULL ORDER BY created_at DESC').all(att.project_id);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Static / SPA ─────────────────────────────────────────────────────────────
app.use(express.static(join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server radi na http://0.0.0.0:${PORT}`);
  console.log(`  Localhost:    http://localhost:${PORT}`);
  console.log(`  Mreža:        http://<tvoja-ip>:${PORT}`);
});
