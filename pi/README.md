# Pi Backup Setup

Backs up encrypted journal entries to your Raspberry Pi nightly. Ciphertext only — the Pi never has your master password.

## Requirements

- Raspberry Pi with Raspberry Pi OS (or any Debian-based distro)
- `curl`, `python3` (pre-installed on Raspberry Pi OS)
- Network access to your Vercel deployment

## Installation

```bash
# 1. Clone or copy the pi/ directory to the Pi
scp -r pi/ pi@raspberrypi.local:/home/pi/journal-backup

# 2. Make scripts executable
chmod +x /home/pi/journal-backup/scripts/*.sh

# 3. Create .env file
cat > /home/pi/journal-backup/.env << 'EOF'
JOURNAL_API_URL=https://your-app.vercel.app
PI_API_TOKEN=your-service-token-here
BACKUP_DIR=/home/pi/journal-backups
EOF
chmod 600 /home/pi/journal-backup/.env

# 4. Create log file
sudo touch /var/log/journal-backup.log
sudo chown pi:pi /var/log/journal-backup.log

# 5. Install cron job
sudo cp /home/pi/journal-backup/cron/journal-backup /etc/cron.d/journal-backup
sudo chown root:root /etc/cron.d/journal-backup
sudo chmod 644 /etc/cron.d/journal-backup
```

## API Token

The `PI_API_TOKEN` is a long-lived token that the Pi uses to authenticate with your journal API. Generate one from your app's admin settings (TBD — see `app/api/backup/` when implemented) or use a static token stored in your app's environment variables.

## Manual Backup

```bash
/home/pi/journal-backup/scripts/backup.sh
```

## Verify Latest Backup

```bash
/home/pi/journal-backup/scripts/verify.sh
```

## Restore from Backup

```bash
# Restore a specific backup date
/home/pi/journal-backup/scripts/restore.sh /home/pi/journal-backups/2025-06-01
```

## Backup Structure

```
/home/pi/journal-backups/
└── YYYY-MM-DD/
    ├── <entry-id>.json   # { id, title, ciphertext, iv, salt, createdAt, mood }
    ├── <entry-id>.json
    └── …
```

Backups older than 90 days are automatically pruned.

## Logs

```bash
tail -f /var/log/journal-backup.log
```
