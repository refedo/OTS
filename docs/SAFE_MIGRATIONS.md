# Safe Database Migration Guide

## ⚠️ IMPORTANT: Preserving Data During Migrations

This guide ensures you never lose data when applying Prisma schema changes.

---

## Current Database State

**Database**: MySQL "mrp" at localhost:3306
**Status**: Production database with live data
**Migration Strategy**: Use `db push` for development, proper migrations for production

---

## Safe Migration Workflow

### For Development (Local Database)

When you have schema drift or want to add new models:

```bash
# 1. Sync schema without losing data
npx prisma db push

# 2. Generate Prisma client
npx prisma generate
```

**What `db push` does:**
- ✅ Syncs schema to database
- ✅ Preserves all existing data
- ✅ No migration files created
- ✅ Safe for development

**When to use:**
- Adding new models (like KPI models)
- Modifying existing models
- Development/testing phase
- When you have schema drift

### For Production (Live Database)

**NEVER use `prisma migrate reset` or `prisma migrate dev --create-only` on production!**

Instead, use this workflow:

```bash
# 1. Create migration file without applying
npx prisma migrate dev --create-only --name your_migration_name

# 2. Review the generated SQL in prisma/migrations/
# Check for data loss operations (DROP, ALTER with data loss)

# 3. If safe, apply migration
npx prisma migrate deploy

# 4. Generate client
npx prisma generate
```

---

## Handling Schema Drift

**Schema drift** = Your database schema doesn't match your migration history.

This happens when:
- You used `db push` during development
- Manual database changes were made
- Migrations were applied out of order

### Solution: Baseline Migrations

If you see "Drift detected" error:

```bash
# Option 1: Use db push (development only)
npx prisma db push

# Option 2: Create baseline migration (production)
# This marks current schema as the starting point
npx prisma migrate resolve --applied "migration_name"
```

---

## KPI Engine Migration (Applied)

**Date**: October 17, 2025
**Method**: `npx prisma db push`
**Status**: ✅ Successfully applied

**Models Added:**
- KPIDefinition
- KPIScore
- KPITarget
- KPIManualEntry
- KPIHistory
- KPIAlert

**User Relations Added:**
- createdKPIDefinitions
- updatedKPIDefinitions
- kpiManualEntries
- approvedKPIEntries
- createdKPIEntries
- kpiHistory
- acknowledgedAlerts

**Data Impact**: No data lost ✅

---

## Common Migration Scenarios

### 1. Adding New Model (Safe)

```prisma
model NewModel {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
}
```

**Command**: `npx prisma db push`
**Risk**: None - new table created

### 2. Adding Optional Field (Safe)

```prisma
model User {
  // ... existing fields
  newField String? // Optional field
}
```

**Command**: `npx prisma db push`
**Risk**: None - nullable column added

### 3. Adding Required Field (⚠️ Requires Default)

```prisma
model User {
  // ... existing fields
  newField String @default("default_value")
}
```

**Command**: `npx prisma db push`
**Risk**: Low - default value provided

### 4. Removing Field (⚠️ Data Loss)

```prisma
model User {
  // Removed: oldField String
}
```

**Command**: Manual migration with backup
**Risk**: HIGH - data will be lost

**Safe approach:**
```bash
# 1. Backup data first
mysqldump -u root -p mrp > backup_$(date +%Y%m%d).sql

# 2. Apply change
npx prisma db push

# 3. Verify application works
# 4. Keep backup for 30 days
```

### 5. Renaming Field (⚠️ Data Loss)

Prisma sees this as delete + create, causing data loss.

**Safe approach:**
```bash
# 1. Add new field
# 2. Migrate data manually
# 3. Remove old field

# Or use raw SQL migration:
npx prisma migrate dev --create-only --name rename_field
# Edit SQL to use RENAME COLUMN instead of DROP/ADD
```

---

## Backup Strategy

### Before Major Migrations

```bash
# Full database backup
mysqldump -u root -p mrp > backups/mrp_backup_$(date +%Y%m%d_%H%M%S).sql

# Backup specific tables
mysqldump -u root -p mrp User Project ProductionLog > backups/critical_tables_backup.sql

# Restore if needed
mysql -u root -p mrp < backups/mrp_backup_20251017_231000.sql
```

### Automated Backup Script

Create `scripts/backup-db.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p${DB_PASSWORD} mrp > backups/mrp_backup_${DATE}.sql
echo "Backup created: mrp_backup_${DATE}.sql"
```

Run before migrations:
```bash
bash scripts/backup-db.sh
```

---

## Troubleshooting

### Error: "Drift detected"

**Solution**:
```bash
npx prisma db push
```

### Error: "Migration failed"

**Solution**:
```bash
# 1. Check error message
# 2. Restore from backup if needed
mysql -u root -p mrp < backups/latest_backup.sql

# 3. Fix schema issue
# 4. Try again
```

### Error: "Foreign key constraint fails"

**Solution**:
```bash
# Check for orphaned records
# Clean up data first
# Then apply migration
```

### Error: "Cannot add NOT NULL column"

**Solution**:
```prisma
// Add as optional first
newField String?

// Later, after populating data:
newField String @default("value")
```

---

## Best Practices

### ✅ DO:
- Use `db push` for development
- Backup before major changes
- Test migrations on staging first
- Review generated SQL
- Use optional fields when possible
- Add defaults for required fields
- Keep migration history clean

### ❌ DON'T:
- Use `migrate reset` on production
- Skip backups
- Rename fields directly
- Remove fields without backup
- Apply untested migrations to production
- Ignore drift warnings

---

## Migration Checklist

Before applying any migration:

- [ ] Backup database
- [ ] Review schema changes
- [ ] Check for data loss operations
- [ ] Test on development database
- [ ] Verify application still works
- [ ] Document the migration
- [ ] Keep backup for 30 days

---

## Emergency Rollback

If a migration causes issues:

```bash
# 1. Stop application
pm2 stop all  # or your process manager

# 2. Restore database
mysql -u root -p mrp < backups/latest_backup.sql

# 3. Revert schema changes
git checkout HEAD~1 prisma/schema.prisma

# 4. Regenerate client
npx prisma generate

# 5. Restart application
pm2 start all
```

---

## Future Migrations Log

### October 17, 2025 - KPI Engine
- **Method**: `db push`
- **Models**: KPIDefinition, KPIScore, KPITarget, KPIManualEntry, KPIHistory, KPIAlert
- **Data Loss**: None
- **Status**: ✅ Success

### [Template for Future Entries]
- **Date**: 
- **Method**: 
- **Changes**: 
- **Data Loss**: 
- **Backup**: 
- **Status**: 

---

## Contact

For migration issues:
1. Check this guide
2. Review Prisma docs: https://www.prisma.io/docs/guides/migrate
3. Check backup files in `/backups`
4. Restore from backup if needed

**Remember**: Always backup before migrations! 🔒
