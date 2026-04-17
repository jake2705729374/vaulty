#!/usr/bin/env bash
# Journal App — Pi Backup Script
# Fetches encrypted entries from the journal API and writes them to disk.
# Ciphertext only — the Pi never has the master password.
#
# Required env vars (set in /home/pi/journal-backup/.env):
#   JOURNAL_API_URL   e.g. https://your-journal.vercel.app
#   PI_API_TOKEN      long-lived service token (set in NEXTAUTH_SECRET-signed JWT or env)
# Optional:
#   BACKUP_DIR        default: /home/pi/journal-backups

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

# Load .env if present
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

: "${JOURNAL_API_URL:?JOURNAL_API_URL is required}"
: "${PI_API_TOKEN:?PI_API_TOKEN is required}"
: "${BACKUP_DIR:=/home/pi/journal-backups}"

DATE=$(date +%Y-%m-%d)
DEST="$BACKUP_DIR/$DATE"
LOG_FILE="/var/log/journal-backup.log"
TEMP_DIR=$(mktemp -d)

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

log "=== Backup started ==="
log "Destination: $DEST"

# --- Fetch entry list ---
log "Fetching entry list…"
LIST_RESP=$(curl -sf \
  -H "Authorization: Bearer $PI_API_TOKEN" \
  -H "Content-Type: application/json" \
  "$JOURNAL_API_URL/api/entries")

ENTRY_IDS=$(echo "$LIST_RESP" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for e in data.get('entries', []):
    print(e['id'])
")

TOTAL=$(echo "$ENTRY_IDS" | grep -c . || true)
log "Found $TOTAL entries to back up"

if [[ "$TOTAL" -eq 0 ]]; then
  log "Nothing to back up. Exiting."
  exit 0
fi

# --- Fetch each entry and write to temp dir ---
SUCCESS=0
FAIL=0

while IFS= read -r entry_id; do
  [[ -z "$entry_id" ]] && continue

  ENTRY_RESP=$(curl -sf \
    -H "Authorization: Bearer $PI_API_TOKEN" \
    "$JOURNAL_API_URL/api/entries/$entry_id") || {
    log "ERROR: Failed to fetch entry $entry_id"
    FAIL=$((FAIL + 1))
    continue
  }

  OUTFILE="$TEMP_DIR/$entry_id.json"
  echo "$ENTRY_RESP" > "$OUTFILE"

  # Verify the file was written and contains a ciphertext field
  if python3 -c "
import sys, json
with open('$OUTFILE') as f:
    d = json.load(f)
assert 'ciphertext' in d and d['ciphertext'], 'Missing ciphertext'
" 2>/dev/null; then
    SUCCESS=$((SUCCESS + 1))
  else
    log "ERROR: Entry $entry_id failed integrity check"
    rm -f "$OUTFILE"
    FAIL=$((FAIL + 1))
  fi
done <<< "$ENTRY_IDS"

if [[ "$FAIL" -gt 0 ]]; then
  log "WARNING: $FAIL entries failed. Aborting copy to prevent partial backup."
  exit 1
fi

# --- Atomically move to final destination ---
mkdir -p "$BACKUP_DIR"
mv "$TEMP_DIR" "$DEST"
log "Backup complete: $SUCCESS entries saved to $DEST"

# --- Prune backups older than 90 days ---
find "$BACKUP_DIR" -maxdepth 1 -type d -name "????-??-??" -mtime +90 -exec rm -rf {} + 2>/dev/null || true

log "=== Backup finished ==="
