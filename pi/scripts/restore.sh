#!/usr/bin/env bash
# Journal App — Pi Restore Script
# Re-imports a backup directory of JSON files to the journal API.
# Entries are ciphertext — the server stores them as-is.
#
# Usage: ./restore.sh <backup-date-dir>
#   e.g. ./restore.sh /home/pi/journal-backups/2025-06-01
#
# Required env vars (same as backup.sh):
#   JOURNAL_API_URL
#   PI_API_TOKEN

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

: "${JOURNAL_API_URL:?JOURNAL_API_URL is required}"
: "${PI_API_TOKEN:?PI_API_TOKEN is required}"

BACKUP_DIR="${1:?Usage: $0 <backup-directory>}"

if [[ ! -d "$BACKUP_DIR" ]]; then
  echo "ERROR: Directory not found: $BACKUP_DIR" >&2
  exit 1
fi

FILES=("$BACKUP_DIR"/*.json)
if [[ ${#FILES[@]} -eq 0 ]] || [[ ! -f "${FILES[0]}" ]]; then
  echo "No JSON files found in $BACKUP_DIR" >&2
  exit 1
fi

echo "Restoring ${#FILES[@]} entries from $BACKUP_DIR…"
SUCCESS=0
SKIP=0
FAIL=0

for file in "${FILES[@]}"; do
  [[ -f "$file" ]] || continue

  # Extract fields
  PAYLOAD=$(python3 -c "
import sys, json
with open('$file') as f:
    d = json.load(f)
out = {
    'title': d.get('title', 'Restored entry'),
    'ciphertext': d['ciphertext'],
    'iv': d['iv'],
    'salt': d['salt'],
}
if d.get('mood'):
    out['mood'] = d['mood']
print(json.dumps(out))
" 2>/dev/null) || {
    echo "SKIP: $file — could not parse"
    SKIP=$((SKIP + 1))
    continue
  }

  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $PI_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "$JOURNAL_API_URL/api/entries")

  if [[ "$HTTP_STATUS" == "201" ]]; then
    SUCCESS=$((SUCCESS + 1))
  else
    echo "FAIL: $file — HTTP $HTTP_STATUS"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "Restore complete: $SUCCESS imported, $SKIP skipped, $FAIL failed"
[[ "$FAIL" -gt 0 ]] && exit 1 || exit 0
