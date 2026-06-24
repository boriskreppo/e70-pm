#!/bin/bash
# Backup dashboard.db — pokreće se automatski svaki dan u 03:00
# Čuva zadnjih 30 dana backupa, starije briše

DB_PATH="/Users/boris/Desktop/e70-pm/dashboard/backend/dashboard.db"
BACKUP_DIR="/Users/boris/Desktop/e70-pm/dashboard/backups"
LOG="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DEST="$BACKUP_DIR/dashboard_$TIMESTAMP.db"

if [ ! -f "$DB_PATH" ]; then
  echo "[$TIMESTAMP] ERROR: Baza nije pronađena: $DB_PATH" >> "$LOG"
  exit 1
fi

# SQLite safe backup koristeći .backup komandu (čita WAL checkpointe)
sqlite3 "$DB_PATH" ".backup '$DEST'"

if [ $? -eq 0 ]; then
  SIZE=$(du -sh "$DEST" | cut -f1)
  echo "[$TIMESTAMP] OK — $DEST ($SIZE)" >> "$LOG"
else
  echo "[$TIMESTAMP] ERROR — backup nije uspio" >> "$LOG"
  exit 1
fi

# Briši backupe starije od 30 dana
find "$BACKUP_DIR" -name "dashboard_*.db" -mtime +30 -delete
echo "[$TIMESTAMP] Stari backupi počišćeni (>30 dana)" >> "$LOG"
