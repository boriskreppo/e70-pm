# Quick Start - Šta uraditi sa Claude Code

## 1. Instaliraj Claude Code (ako nemaš)

U terminalu:

```bash
npm install -g @anthropic-ai/claude-code
```

Ili pogledaj zvaničnu dokumentaciju: https://docs.claude.com

## 2. Raspakuj zip i uđi u folder

```bash
cd ~/Downloads          # ili gdje god je zip
unzip dashboard-app.zip
mv dashboard-app ~/     # premjesti u home folder (opciono)
cd ~/dashboard-app
```

## 3. Pokreni Claude Code

```bash
claude
```

## 4. Daj mu ovaj prompt

Kopiraj-zalijepi ovo u Claude Code:

```
U ovom folderu je Project Management Dashboard koji treba podići lokalno
na mom Mac Mini-ju + dostupan preko interneta sa Tailscale-om.

Pročitaj CLAUDE.md fajl, on ima kompletne instrukcije šta treba uraditi.

Vodi me kroz korake jedan po jedan, ne radi sve odjednom.
Pitaj me gdje god ti treba moja informacija (username, putanja, itd).
```

## 5. To je to

Claude Code će:
- Provjeriti Node verziju
- Instalirati dependencies
- Buildati frontend
- Testirati da radi
- Konfigurisati launchd auto-start
- Pomoći ti sa Tailscale setupom
- Riješiti probleme ako naiđu

## Šta da provjeriš da je sve radi

Nakon završetka, na Mac Mini-ju:

```bash
# Server radi
curl http://localhost:3001/api/health
# Treba: {"status":"ok",...}

# Auto-start je aktivan
launchctl list | grep dashboard
# Treba: com.dashboard.server  (sa PID brojem)

# Tailscale radi
tailscale ip -4
# Treba: 100.x.x.x
```

Sa telefona/drugog uređaja koji ima Tailscale: otvori `http://<tailscale-ip>:3001`

## Backup

Sav tvoj rad je u jednom fajlu:
```
~/dashboard-app/backend/dashboard.db
```

Najbolji savjet: stavi ovaj fajl u iCloud/Dropbox folder ili napravi cron za dnevni backup.
