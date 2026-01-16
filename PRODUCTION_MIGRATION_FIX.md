# Production Migration Fix Guide

## Problem
Migration `20251125193805_add_business_planning_module` is failing with:
```
Table 'ots_db.project' doesn't exist
```

## Root Cause
The production database is missing earlier migrations. The migration is trying to alter the `project` table which should have been created in migration `20251011204406_add_comprehensive_project_and_client`.

## Solution Options

### Option 1: Reset Migration State and Apply All (RECOMMENDED for production with data)

This approach marks the failed migration as rolled back and reapplies from a clean state.

```bash
# SSH into production server
ssh root@hexasteel

# Navigate to app directory
cd /var/www/hexasteel.sa/ots

# Check current migration status
npx prisma migrate status

# Mark the failed migration as rolled back
npx prisma migrate resolve --rolled-back 20251125193805_add_business_planning_module

# Now use db push to sync schema without migrations (safer for production)
npx prisma db push --skip-generate

# If that works, regenerate Prisma client
npx prisma generate

# Rebuild and restart
npm run build
pm2 restart all
```

### Option 2: Use Prisma DB Push (FASTEST - Recommended)

This bypasses migrations entirely and syncs the database schema directly from `schema.prisma`:

```bash
cd /var/www/hexasteel.sa/ots

# Push schema changes directly to database
npx prisma db push --accept-data-loss

# Generate Prisma client
npx prisma generate

# Rebuild and restart
npm run build
pm2 restart all
```

**Warning**: `--accept-data-loss` flag is needed because some schema changes might require data transformation. Review carefully.

### Option 3: Manual Migration Fix (If you understand the schema)

If you know the production database already has the tables, you can mark migrations as applied:

```bash
# Mark the failed migration as applied (only if tables already exist)
npx prisma migrate resolve --applied 20251125193805_add_business_planning_module

# Then try to continue
npx prisma migrate deploy
```

### Option 4: Check and Apply Missing Migrations Individually

```bash
# First, check which migrations are missing
npx prisma migrate status

# If earlier migrations are missing, you need to apply them in order
# This might require starting from scratch or manually creating missing tables
```

## Recommended Steps for Your Situation

Based on the error, here's what I recommend:

### Step 1: Check Migration Status
```bash
cd /var/www/hexasteel.sa/ots
npx prisma migrate status
```

This will show you which migrations have been applied and which are pending.

### Step 2: Use DB Push (Safest for now)
```bash
# This will sync your database with the schema without using migrations
npx prisma db push

# If it asks about data loss, review the changes carefully
# If you're sure, use:
npx prisma db push --accept-data-loss
```

### Step 3: Regenerate Client
```bash
npx prisma generate
```

### Step 4: Rebuild and Restart
```bash
npm run build
pm2 restart all
```

## Alternative: Fresh Migration State

If the database is relatively new or you can afford to reset migration history:

```bash
# 1. Baseline the current state
npx prisma migrate resolve --applied 20251125193805_add_business_planning_module

# 2. Apply any remaining migrations
npx prisma migrate deploy
```

## Verification

After applying the fix:

```bash
# Test database connection
node scripts/test-objectives-api.js

# Check if tables exist
npx prisma studio

# Test the API
curl http://localhost:3000/api/business-planning/objectives?year=2025
```

## Important Notes

1. **Backup First**: Always backup your production database before running migrations
   ```bash
   mysqldump -u root -p ots_db > ots_db_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Check Existing Tables**: Before using `db push`, verify what tables already exist:
   ```bash
   mysql -u root -p ots_db -e "SHOW TABLES;"
   ```

3. **Migration vs DB Push**:
   - `migrate deploy`: Uses migration files, tracks history
   - `db push`: Syncs schema directly, no migration history
   - For production with existing data, `db push` is often safer

## Common Issues

### Issue: "Table already exists"
**Solution**: The table exists but migration history is out of sync. Use:
```bash
npx prisma migrate resolve --applied <migration_name>
```

### Issue: "Column already exists"
**Solution**: Same as above, or use `db push` which handles this automatically.

### Issue: "Cannot add foreign key constraint"
**Solution**: Referenced table doesn't exist. Apply earlier migrations first or use `db push`.

## Quick Fix Command (All-in-One)

If you want to just fix it quickly:

```bash
cd /var/www/hexasteel.sa/ots && \
npx prisma db push --accept-data-loss && \
npx prisma generate && \
npm run build && \
pm2 restart all
```

## After Fix

Once the database is synced:

1. Test the objectives page: `https://ots.hexasteel.sa/business-planning/objectives`
2. Check server logs: `pm2 logs`
3. Verify no errors in browser console

## Prevention

For future deployments:

1. Always run `npx prisma migrate deploy` in development first
2. Test migrations in a staging environment
3. Keep migration history in sync between environments
4. Consider using `prisma migrate diff` to check schema differences

---

**Status**: Ready to apply
**Recommended**: Use Option 2 (DB Push) - fastest and safest for this situation
