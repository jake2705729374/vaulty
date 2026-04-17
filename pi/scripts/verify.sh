#!/usr/bin/env bash
# Journal App — Pi Backup Verification Script
# Checks that a backup directory contains valid, complete entry JSON files.
#
# Usage: ./verify.sh [backup-date-dir]
#   Default: most recent backup in /home/pi/journal-backups

set -euo pipefail

BACKUP_ROOT="${BACKUP_DIR:-/home/pi/journal-backups}"

if [[ -n "${1:-}" ]]; then
  TARGET_DIR="$1"
else
  # Use most recent backup
  TARGET_DIR=$(find "$BACKUP_ROOT" -maxdepth 1 -type d -name "????-??-??" | sort | tail -1)
  if [[ -z "$TARGET_DIR" ]]; then
    echo "ERROR: No backups found in $BACKUP_ROOT" >&2
    exit 1
  fi
fi

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "ERROR: Directory not found: $TARGET_DIR" >&2
  exit 1
fi

echo "Verifying backup: $TARGET_DIR"

FILES=("$TARGET_DIR"/*.json)
if [[ ${#FILES[@]} -eq 0 ]] || [[ ! -f "${FILES[0]}" ]]; then
  echo "ERROR: No JSON files found in $TARGET_DIR" >&2
  exit 1
fi

PASS=0
FAIL=0
FAIL_LIST=()

for file in "${FILES[@]}"; do
  [[ -f "$file" ]] || continue

  RESULT=$(python3 - "$file" <<'EOF'
import sys, json, base64

path = sys.argv[1]
with open(path) as f:
    try:
        d = json.load(f)
    except Exception as e:
        print(f"INVALID_JSON:{e}")
        sys.exit(0)

errors = []
for field in ("id", "title", "ciphertext", "iv", "salt", "createdAt"):
    if not d.get(field):
        errors.append(f"missing:{field}")

# Validate base64 fields
for field in ("ciphertext", "iv", "salt"):
    try:
        base64.b64decode(d.get(field, ""))
    except Exception:
        errors.append(f"invalid_base64:{field}")

print(",".join(errors) if errors else "OK")
EOF
  )

  if [[ "$RESULT" == "OK" ]]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    FAIL_LIST+=("$(basename "$file"): $RESULT")
  fi
done

echo ""
echo "Results: $PASS passed, $FAIL failed"

if [[ ${#FAIL_LIST[@]} -gt 0 ]]; then
  echo ""
  echo "Failed files:"
  for item in "${FAIL_LIST[@]}"; do
    echo "  ✗ $item"
  done
  exit 1
else
  echo "All entries verified ✓"
  exit 0
fi
