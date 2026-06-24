# Project Management Dashboard

Interni dashboard za praćenje projekata sa pristupom sa interneta preko Tailscale-a.

## 📦 Šta dobijaš

- **Backend**: Node.js + Express + SQLite (svi podaci u 1 fajlu)
- **Frontend**: React + Vite + Tailwind
- **Deployment**: Mac Mini + Tailscale (besplatno, bez otvaranja portova)
- **Auto-start**: launchd servis - server se sam upali kad upali Mac

## 🛠️ Šta ti treba

1. **Mac Mini** sa macOS
2. **Node.js 22.5+** (potrebno zbog ugrađenog `node:sqlite` modula) - instaliraj sa `brew install node`
3. **Tailscale account** - besplatan za do 100 uređaja: [tailscale.com](https://tailscale.com)

> **Napomena:** Backend koristi **ugrađeni SQLite u Node.js 22.5+** (bez native dependency-ja). To znači da setup neće imati probleme sa kompilacijom. Ako imaš stariju verziju Node-a, ažuriraj sa `brew upgrade node`.

---

## 🚀 Korak po korak

### 1. Instaliraj Node.js (ako nemaš)

```bash
# Instaliraj Homebrew ako nemaš
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instaliraj Node
brew install node

# Provjeri
node -v   # treba da bude v20+
```

### 2. Skini fajlove na Mac Mini

Stavi cijeli `dashboard-app/` folder u svoj home (npr. `/Users/tvojeime/dashboard-app/`).

### 3. Pokreni setup

```bash
cd ~/dashboard-app
bash setup.sh
```

Setup će:
- Instalirati backend dependency-je
- Instalirati frontend dependency-je
- Buildati frontend (output ide u `backend/public/`)

### 4. Pokreni server (test)

```bash
cd backend
npm start
```

Trebao bi da vidiš:
```
✓ Baza inicijalizovana: /Users/.../dashboard.db
✓ Server radi na http://0.0.0.0:3001
```

Otvori u browseru: **http://localhost:3001**

Trebao bi da vidiš dashboard. Dodaj test projekat - podaci će ostati zapamćeni u `backend/dashboard.db`.

---

## 🌐 Pristup sa interneta - Tailscale

### Zašto Tailscale (a ne portovi)?

- ✅ **Bez router setupa** - ne treba forwardovati portove
- ✅ **Bez statičke IP** - radi sa bilo kog interneta
- ✅ **Sigurnije od javnog porta** - samo tvoji uređaji vide server
- ✅ **Besplatno** za do 100 uređaja

### Setup

#### 1. Na Mac Mini-ju:
```bash
# Instaliraj Tailscale
brew install --cask tailscale

# Otvori Tailscale.app i prijavi se
# Prijavi se sa Google/GitHub računom
```

Nakon prijave, Mac Mini dobija Tailscale IP poput **100.64.0.5** (ostaje isti zauvijek).

#### 2. Na drugim uređajima (telefon, laptop, kolega):
- Skini Tailscale app: [tailscale.com/download](https://tailscale.com/download)
- Prijavi se istim računom (ili pozovi kolegu na svoj tailnet)

#### 3. Pristup:
Sa bilo kog uređaja koji ima Tailscale, idi na:
```
http://100.64.0.5:3001
```
(zamijeni IP svojim Tailscale IP-om)

#### 4. Ljepši URL (opciono):
Tailscale ima **MagicDNS** - ako uključiš u admin konzoli, dobiješ:
```
http://mac-mini:3001
```

---

## 🔄 Auto-start servisa

Da se server sam upali kad upali Mac:

### 1. Editiraj `com.dashboard.server.plist`
Otvori fajl i zamijeni **PROMIJENI_USERNAME** sa svojim username-om (provjeri sa `whoami` u terminalu).

### 2. Provjeri putanju do Node-a:
```bash
which node
```
Ako nije `/usr/local/bin/node` (npr. ako je `/opt/homebrew/bin/node` na Apple Silicon-u), promijeni i to u plist fajlu.

### 3. Instaliraj servis:
```bash
cp com.dashboard.server.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.dashboard.server.plist
```

### 4. Provjeri da radi:
```bash
launchctl list | grep dashboard
```

### Korisne komande:

```bash
# Stop
launchctl unload ~/Library/LaunchAgents/com.dashboard.server.plist

# Start ponovo
launchctl load ~/Library/LaunchAgents/com.dashboard.server.plist

# Pogledaj logove
tail -f ~/dashboard-app/backend/server.log
tail -f ~/dashboard-app/backend/server.error.log
```

---

## 💾 Backup podataka

Svi podaci su u **jednom fajlu**: `backend/dashboard.db`

Backup je trivijalan - samo kopiraj fajl:

```bash
# Manuelni backup
cp ~/dashboard-app/backend/dashboard.db ~/dashboard-backup-$(date +%Y%m%d).db

# Auto-backup u cron (dnevno u 02:00)
crontab -e
# Dodaj liniju:
0 2 * * * cp ~/dashboard-app/backend/dashboard.db ~/Backups/dashboard-$(date +\%Y\%m\%d).db
```

Možeš i da ga sync-uješ na iCloud/Dropbox folder.

---

## 🔒 Sigurnost

Trenutno **nema autentifikacije** - svako sa Tailscale pristupom može sve.

To je OK ako:
- Tvoj tailnet ima samo tebe i kolege od povjerenja
- Mac Mini ne otvara port 3001 javno

**NIKAD nemoj uraditi `port forward 3001` na ruteru** - to bi otvorilo dashboard cijelom internetu.

### Ako želiš auth kasnije:
Mogu dodati basic login (username/password) - reci pa ti pripremim update.

---

## 📂 Struktura projekta

```
dashboard-app/
├── backend/
│   ├── server.js           # Express + SQLite API
│   ├── package.json
│   ├── dashboard.db        # SQLite baza (kreira se sam)
│   └── public/             # Buildani frontend (kreira se sam)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # React komponenta
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── com.dashboard.server.plist  # launchd auto-start
├── setup.sh                    # Instalacija
└── README.md                   # Ovaj fajl
```

---

## 🐛 Troubleshooting

**Server ne starta:**
```bash
cd backend
npm start
# Pogledaj greške u terminalu
```

**Port 3001 zauzet:**
```bash
lsof -i :3001
kill -9 <PID>
```

**Nakon git pull / izmjena - rebuild frontend:**
```bash
cd frontend
npm run build
# i restartuj server
```

**Ne mogu da pristupim sa drugog uređaja:**
1. Provjeri da li je Tailscale upaljen na oba uređaja
2. Provjeri Tailscale IP: `tailscale ip -4`
3. Provjeri firewall na Mac-u: System Settings → Network → Firewall (treba dozvoliti node)

---

## 🎯 Sljedeći koraci (kad budeš spreman)

- **Auth** - basic login za više korisnika
- **Milestones** - taskovi unutar projekta
- **Team members** - dodjela odgovornosti
- **Notifikacije** - email/Slack kad se rok bliži
- **Eksport** - PDF/Excel izvještaji

Sve se može dodati postepeno bez razbijanja postojećeg.
