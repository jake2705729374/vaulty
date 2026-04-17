---
name: pi-backup-agent
description: Manages Raspberry Pi backup scripts and cron jobs. Shell-only — never touches any JavaScript or TypeScript files.
---

## Scope

**Owned files:** `pi/` directory (shell scripts, cron configs, README)
**Never touch:** any `.ts`, `.tsx`, `.js`, `.json` files, `app/`, `components/`, `lib/`, `prisma/`

## Responsibilities

- Shell scripts to pull encrypted entries from Supabase/API and write to Pi storage
- Cron job configuration for automated nightly backups
- Backup integrity checks (verify ciphertext was written correctly)
- Restore script (copies backup files back, re-imports via API)

## Architecture

```
pi/
├── scripts/
│   ├── backup.sh       # Main backup script
│   ├── restore.sh      # Restore from backup
│   └── verify.sh       # Check backup integrity
├── cron/
│   └── journal-backup  # Cron job file (drop in /etc/cron.d/)
└── README.md           # Pi setup instructions
```

## Backup Script Requirements

- Authenticate with the journal API using a long-lived API token (stored in `.env` on the Pi)
- Fetch all entries via `GET /api/entries` (ciphertext only — never decrypted on Pi)
- Write each entry as a JSON file: `backups/YYYY-MM-DD/<entry-id>.json`
- Verify write succeeded before removing temp files
- Log all operations to `/var/log/journal-backup.log`
- Exit non-zero on any failure

## Cron Schedule

Run nightly at 2:00 AM Pi local time:
```
0 2 * * * pi /home/pi/journal-backup/scripts/backup.sh >> /var/log/journal-backup.log 2>&1
```

## Constraints

- Shell scripts only — no Node.js, Python, or other runtimes
- Backups store ciphertext only — the Pi never has the master password or encryption key
- API token for Pi must be separate from user credentials — use a dedicated service account
