# Instrukcija za Claude Code

Pozdrav! Korisnik ima Mac Mini i želi da podigne ovaj Project Management Dashboard
da mu radi lokalno + da bude dostupan sa interneta preko Tailscale-a.

Sve je već razvijeno i testirano u Anthropic sandbox-u. Tvoj posao je da
završiš lokalni setup na njegovom Mac-u.

## Šta je već gotovo (NE TREBA DIRATI)

- ✅ `backend/server.js` - Express API sa SQLite (testiran, radi)
- ✅ `backend/package.json` - dependencies definisane
- ✅ `frontend/src/App.jsx` - kompletan React UI (testiran u artifactu)
- ✅ `frontend/vite.config.js` - proxy ka backendu konfigurisan
- ✅ `com.dashboard.server.plist` - launchd template za auto-start
- ✅ `setup.sh` - skripta za instalaciju

## Šta TI treba da uradiš

### Korak 1: Provjeri Node.js verziju
```bash
node -v
```
Treba 22.5 ili noviji (zbog ugrađenog `node:sqlite` modula).
Ako je stariji ili ga nema:
```bash
brew install node     # ili: brew upgrade node
```

### Korak 2: Pokreni setup
```bash
cd ~/dashboard-app    # ili gdje god da si raspakovao zip
bash setup.sh
```

To će:
- Instalirati backend dependencies (`express`, `cors`)
- Instalirati frontend dependencies (`react`, `vite`, `tailwindcss`, `lucide-react`)
- Buildati frontend → output u `backend/public/`

### Korak 3: Test pokretanje
```bash
cd backend
npm start
```

Trebao bi da vidiš:
```
✓ Baza inicijalizovana: .../dashboard.db
✓ Server radi na http://0.0.0.0:3001
```

Otvori http://localhost:3001 u browseru. Korisnik treba da vidi dashboard.
Dodaj test projekat, restartuj server, provjeri da podaci ostaju.

### Korak 4: Konfiguriši launchd (auto-start)

1. Pitaj korisnika za njegov username (`whoami` u terminalu)
2. Pitaj gdje je instalirao app (najčešće `~/dashboard-app` tj. `/Users/USERNAME/dashboard-app`)
3. Provjeri putanju do Node-a: `which node`
   - Apple Silicon: obično `/opt/homebrew/bin/node`
   - Intel Mac: obično `/usr/local/bin/node`
4. Editiraj `com.dashboard.server.plist`:
   - Zamijeni sve `PROMIJENI_USERNAME` sa stvarnim username-om
   - Provjeri da li je putanja do `node` tačna (linija sa `<string>/usr/local/bin/node</string>`)
5. Instaliraj servis:
   ```bash
   cp com.dashboard.server.plist ~/Library/LaunchAgents/
   launchctl load ~/Library/LaunchAgents/com.dashboard.server.plist
   ```
6. Provjeri da radi:
   ```bash
   launchctl list | grep dashboard
   curl http://localhost:3001/api/health
   ```

### Korak 5: Tailscale setup (za pristup sa interneta)

```bash
brew install --cask tailscale
```

Reci korisniku da:
1. Otvori Tailscale.app i prijavi se (Google/GitHub)
2. Skine Tailscale na druge uređaje gdje želi pristup (telefon, drugi laptop, kolege)
3. Provjerite Tailscale IP: `tailscale ip -4`

Pristup sa drugih uređaja: `http://<tailscale-ip>:3001`

Opciono: u Tailscale admin konzoli uključi MagicDNS pa se pristupa preko
`http://mac-mini:3001` (ili kako god se zove uređaj).

### Korak 6: Firewall

macOS firewall može blokirati ulazne konekcije na port 3001.
Provjeri: System Settings → Network → Firewall.
Ako je upaljen, dodaj `node` u dozvoljene aplikacije, ili dozvoli ulazne
konekcije za njega kad iskoči prompt.

## Korisne komande za debug

```bash
# Pogledaj log servera
tail -f ~/dashboard-app/backend/server.log

# Restart servisa
launchctl unload ~/Library/LaunchAgents/com.dashboard.server.plist
launchctl load ~/Library/LaunchAgents/com.dashboard.server.plist

# Stop trajno
launchctl unload ~/Library/LaunchAgents/com.dashboard.server.plist
rm ~/Library/LaunchAgents/com.dashboard.server.plist

# Provjeri da li je port slobodan
lsof -i :3001

# Backup baze
cp ~/dashboard-app/backend/dashboard.db ~/dashboard-backup-$(date +%Y%m%d).db
```

## Česti problemi

**npm install puca na better-sqlite3 ili gyp:**
- Backend NE koristi `better-sqlite3`, koristi ugrađeni `node:sqlite`.
- Ako vidiš ovu grešku, znači da neko stari `package.json` se vukao -
  obriši `node_modules` i `package-lock.json` i pokreni `npm install` ponovo.

**Server starta ali ne mogu da pristupim sa drugog uređaja:**
- Provjeri da li je Tailscale upaljen na oba
- Provjeri Mac firewall
- `tailscale ping <drugi-uređaj>` da testiraš konektivnost

**"SQLite is an experimental feature" warning:**
- Normalno, ignoriši. To je samo info da je `node:sqlite` eksperimentalan.
- Radi savršeno, samo Node ispisuje upozorenje.

**Frontend pokazuje "offline" indikator:**
- Backend nije pokrenut, ili je na drugom portu.
- Provjeri `npm start` u backend folderu.

## Kada završiš

Reci korisniku:
1. URL za lokalni pristup: `http://localhost:3001`
2. Tailscale IP/URL za pristup sa drugih uređaja
3. Gdje je `dashboard.db` fajl (za backup)
4. Kako da provjeri da li servis radi nakon reboota
