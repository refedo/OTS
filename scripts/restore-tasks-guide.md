# Task Restoration Guide

## Emergency: Restore Lost Tasks from Daily Backup

### Prerequisites
- SSH access to production server
- MySQL root access
- Latest daily backup file (usually in `/var/backups/mysql/` or similar)

---

## Step-by-Step Restoration Process

### 1. Locate Your Latest Backup
```bash
# Common backup locations - check where your backups are stored
ls -lh /var/backups/mysql/
ls -lh /root/backups/
ls -lh /backup/mysql/

# Find the most recent backup (look for today's date or yesterday's)
# Backup files are usually named like: ots_db_backup_2024-02-16.sql or similar
```

### 2. Verify Backup File
```bash
# Check backup file size (should be several MB)
ls -lh /path/to/backup/ots_db_backup_YYYY-MM-DD.sql

# Quick check of backup content (should show CREATE TABLE and INSERT statements)
head -n 50 /path/to/backup/ots_db_backup_YYYY-MM-DD.sql
grep -i "CREATE TABLE.*tasks" /path/to/backup/ots_db_backup_YYYY-MM-DD.sql
```

### 3. Create Temporary Backup Database
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ots_db_backup;"
```

### 4. Import Backup to Temporary Database
```bash
# This imports the backup into a separate database to avoid overwriting current data
mysql -u root -p ots_db_backup < /path/to/backup/ots_db_backup_YYYY-MM-DD.sql

# Check if tasks were imported
mysql -u root -p -e "SELECT COUNT(*) as task_count FROM ots_db_backup.tasks;"
```

### 5. Restore Tasks to Production Database
```bash
# Option A: Restore only tasks (recommended - preserves other data)
mysql -u root -p ots_db << 'EOF'
-- Restore tasks
INSERT IGNORE INTO tasks 
SELECT * FROM ots_db_backup.tasks;

-- Restore task audit logs
INSERT IGNORE INTO task_audit_log
SELECT * FROM ots_db_backup.task_audit_log;

-- Verify restoration
SELECT COUNT(*) as restored_tasks FROM tasks;
EOF
```

### 6. Verify Restoration
```bash
# Check task counts
mysql -u root -p ots_db -e "
SELECT 
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress,
    COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed
FROM tasks;
"

# Check recent tasks
mysql -u root -p ots_db -e "
SELECT id, title, status, assignedToId, createdAt 
FROM tasks 
ORDER BY createdAt DESC 
LIMIT 20;
"
```

### 7. Clean Up Temporary Database (After Verification)
```bash
mysql -u root -p -e "DROP DATABASE ots_db_backup;"
```

### 8. Restart Application
```bash
cd /var/www/hexasteel.sa/ots/
pm2 restart hexa-steel-ots
pm2 logs hexa-steel-ots --lines 50
```

---

## Alternative: Full Database Restore (Use with Caution)

**⚠️ WARNING: This will restore the ENTIRE database to the backup state. Any changes made after the backup will be lost!**

```bash
# Stop the application
pm2 stop hexa-steel-ots

# Backup current state (just in case)
mysqldump -u root -p ots_db > /tmp/ots_db_before_restore_$(date +%Y%m%d_%H%M%S).sql

# Drop and recreate database
mysql -u root -p -e "DROP DATABASE ots_db; CREATE DATABASE ots_db;"

# Restore from backup
mysql -u root -p ots_db < /path/to/backup/ots_db_backup_YYYY-MM-DD.sql

# Restart application
pm2 restart hexa-steel-ots
```

---

## Troubleshooting

### Issue: "Duplicate entry" errors during restoration
```bash
# Use INSERT IGNORE to skip duplicates
mysql -u root -p ots_db -e "INSERT IGNORE INTO tasks SELECT * FROM ots_db_backup.tasks;"
```

### Issue: Foreign key constraint errors
```bash
# Temporarily disable foreign key checks
mysql -u root -p ots_db << 'EOF'
SET FOREIGN_KEY_CHECKS=0;
INSERT IGNORE INTO tasks SELECT * FROM ots_db_backup.tasks;
INSERT IGNORE INTO task_audit_log SELECT * FROM ots_db_backup.task_audit_log;
SET FOREIGN_KEY_CHECKS=1;
EOF
```

### Issue: Can't find backup file
```bash
# Search for backup files
find /var -name "*ots*backup*.sql" -type f -mtime -7 2>/dev/null
find /root -name "*backup*.sql" -type f -mtime -7 2>/dev/null
find /backup -name "*.sql" -type f -mtime -7 2>/dev/null

# Check cron jobs for backup location
crontab -l | grep -i backup
```

---

## Prevention: Set Up Automated Backups (If Not Already Done)

### Create Daily Backup Script
```bash
cat > /root/scripts/daily-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DIR/ots_db_backup_$DATE.sql"

mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u root -p'YOUR_PASSWORD' ots_db > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "ots_db_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

chmod +x /root/scripts/daily-backup.sh
```

### Add to Crontab (Daily at 2 AM)
```bash
crontab -e
# Add this line:
0 2 * * * /root/scripts/daily-backup.sh >> /var/log/mysql-backup.log 2>&1
```

---

## Quick Reference Commands

```bash
# Find latest backup
ls -lt /var/backups/mysql/ | head -n 5

# Check task count in backup
mysql -u root -p ots_db_backup -e "SELECT COUNT(*) FROM tasks;"

# Restore tasks only
mysql -u root -p ots_db -e "INSERT IGNORE INTO tasks SELECT * FROM ots_db_backup.tasks;"

# Verify restoration
mysql -u root -p ots_db -e "SELECT COUNT(*) FROM tasks;"
```
