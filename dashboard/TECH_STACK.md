# e70 PM Dashboard — Tech Stack & Funkcionalnosti

Interni project management alat za tim e70solutions. Tri korisnika: boris, sale, pero.

---

## Stack

| Sloj | Tehnologija |
|------|-------------|
| Runtime | Node.js 22.5+ (obavezan zbog `node:sqlite`) |
| Backend | Express 4, JWT auth, bcryptjs, multer, archiver, express-rate-limit |
| Baza | SQLite — jedan fajl `backend/dashboard.db`, WAL mode |
| Frontend | React 18, Vite, inline styles (bez CSS frameworka) |
| Process manager (prod) | PM2 s `ecosystem.config.cjs` |
| Web server (prod) | Apache ProxyPass → localhost:3001, AutoSSL via WHM |

---

## Arhitektura

- **Single-port app**: Express servira i API (`/api/*`) i React SPA (`backend/public/`) na portu 3001
- **Frontend build**: `frontend/` → Vite build → `backend/public/` (ne ide na server kao source)
- **Auth**: JWT s 30-dnevnim ekspiryjem; token se čuva u localStorage
- **File upload**: multer → flat `uploads/` folder (UUID filenames), metadata u SQLite
- **Download auth**: download rute su van JWT middlewarea; verifikuju token iz `?token=` query stringa (jer `<a href>` ne može slati headere)
- **Migracije**: inkrementalne `ALTER TABLE` provjere pri startu servera — nema migration fajlova

---

## Funkcionalnosti

### Projekti
- Kreiranje, editovanje, brisanje projekata
- Polja: naziv, opis, deadline, status, prioritet, vlasnik (owner), tagovi
- Ručno podešavanje progresa (0–100%)
- Soft arhiviranje — arhivirani projekti vidljivi samo u ARHIVA filteru
- Inline editovanje naziva projekta (dvostruki klik)
- CSV export liste projekata

### Taskovi
- CRUD taskovi unutar projekta
- Polja: naziv, status (TODO/IN_PROGRESS/DONE/BLOCKED), prioritet, vlasnik, rok
- Drag & drop reordering
- Bulk akcije — selektuj više taskova, promijeni status ili obriši

### Pogledi (Views)
- **Lista** — tabela sa filterima i sortiranjem
- **Kanban** — kolone po statusu, drag & drop između kolona
- **Gantt** — horizontalni bar chart po rokovima, sticky lijeva kolona

### Detail View (sidebar projekta)
- Tab **BELEŠKE** — rich text beleške, inline editovanje (dvostruki klik)
- Tab **FAJLOVI** — upload i pregled fajlova zakačenih za projekat
- Tab **AKTIVNOST** — log svih izmjena na projektu

### Task Modal (tabovi)
- Tab **UREDI** — forma za editovanje taska
- Tab **KOMENTARI** — komentari po tasku s avatarima i vremenom
- Tab **FAJLOVI** — upload i pregled fajlova zakačenih za task

### File Attachments
- Upload: drag & drop ili klik, progress bar (XHR)
- Limit: 15 MB po fajlu, blokira izvršne fajlove (.exe, .sh, .bat...)
- **Slike**: grid prikaz (3 kolone), klik otvara lightbox (strelice, dots, Esc/←/→ tipkovnica, download)
- **Dokumenti**: lista s ikonama (PDF/DOC/XLS/PPT/ZIP/TXT), veličina, uploader, relativno vrijeme
- Download single fajl / Download All (streaming ZIP via archiver)
- Brisanje samo vlastitih fajlova

### Notifikacije
- Bell ikona u headeru s unread badge (crvena tačka)
- Kreira se kad se task dodijeli drugom korisniku
- Klik na notifikaciju otvara taj projekat
- Označi sve kao pročitano
- Polling svakih 60 sekundi

### Pretraga
- Global search modal (Cmd+K)
- Pretražuje projekte, taskove i beleške istovremeno

### Keyboard shortcuts
- `Cmd+K` — otvori search
- `E` — edituj projekt (kad si u detail viewu)
- `Backspace` — nazad na listu
- `D` — označi task kao done

### Korisnički profil
- Editovanje display name i emaila
- Promjena lozinke

### Aktivnost
- Log po projektu (u sidebaru)
- Globalni activity feed (sve izmjene svih korisnika)

---

## Baza — tabele

```
projects     — id, title, description, deadline, status, priority, owner, owner_color,
               manual_progress, tags, archived, updated_at, created_at
tasks        — id, project_id, title, status, priority, owner, due_date, position, created_at
notes        — id, project_id, content, created_at
users        — username (PK), password_hash, display_name, email, created_at
activity     — id, project_id, user, action, details (JSON), created_at
notifications — id, user, type, project_id, message, read, created_at
task_notes   — id, task_id, project_id, user, content, created_at
attachments  — id, project_id, task_id (nullable), original_name, stored_name,
               size, mime_type, uploader, created_at
```

---

## Ključni fajlovi

```
dashboard/
├── backend/
│   ├── server.js              — cijeli API (~800+ linija)
│   ├── dashboard.db           — jedini source of truth
│   ├── uploads/               — fajlovi (UUID nazivi, nikad brisati pri deployu)
│   ├── package.json
│   ├── ecosystem.config.cjs   — PM2 config za produkciju
│   └── .env.example           — template za prod env varijable
│
├── frontend/src/
│   ├── App.jsx                — glavni component, svo state management
│   ├── api.js                 — fetch wrapper s JWT headerom
│   ├── tokens.js              — ACCENT boja, APP_USERS mapa (username → inicijali/boja)
│   ├── utils.js               — effectiveStatus, daysLeft, formatDate, relativeTime
│   └── components/
│       ├── DetailView.jsx     — detalj projekta (sidebar, tabovi)
│       ├── Modals.jsx         — ProjectModal, TaskModal
│       ├── AttachmentPanel.jsx — upload, lightbox, download all
│       ├── NotificationBell.jsx
│       ├── GanttView.jsx
│       ├── GlobalSearch.jsx   — Cmd+K modal
│       ├── ActivityFeed.jsx
│       ├── KanbanView.jsx
│       └── ProfilePage.jsx
│
├── TECH_STACK.md              — ovaj fajl
├── CLAUDE.md                  — instrukcije za Claude Code
└── ecosystem.config.cjs       — PM2 config (kopija za lakši deploy)
```

---

## Produkcija

- **Server**: Linux VPS, WHM/cPanel root pristup
- **App folder**: `/var/www/pm-dashboard/`
- **Port**: 3001 (Apache ProxyPass sa subdomene)
- **SSL**: AutoSSL u WHM
- **Env varijable**: `JWT_SECRET`, `PORT=3001`, `NODE_ENV=production`

### Deploy procedura
```bash
# Lokalno
cd frontend && npm run build
cd ..
zip -r pm-dashboard.zip backend \
  --exclude "backend/node_modules/*" \
  --exclude "backend/dashboard.db" \
  --exclude "backend/uploads/*" \
  --exclude "backend/.env"

# Na serveru
cd /var/www/pm-dashboard
unzip -o pm-dashboard.zip
cd backend
npm install --omit=dev
mkdir -p uploads
pm2 restart pm-dashboard
```

---

## Što nije implementirano (svjesno odloženo)

| Feature | Razlog |
|---------|--------|
| Email notifikacije | Čeka SMTP/Mailgun setup na VPS-u |
| User management UI | Trenutno samo direktno u bazi |
| Thumbnail generacija | sharp paket, preskočeno za v1 |
| Per-project storage limit | Planirali 200MB, nije implementirano |
