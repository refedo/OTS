# Maintenance Scripts

**Last Updated:** October 16, 2025

## Overview

Maintenance scripts for database cleanup, migration, and system health.

## Available Scripts

### 1. QC System Cleanup

**File:** `cleanup-qc-system.bat`

**Purpose:** Clean up broken RFIs and orphaned QC statuses

**When to Run:**
- After schema migration
- Monthly maintenance
- When data inconsistencies detected
- After bulk RFI deletion

**Usage:**
```bash
# Stop dev server first (Ctrl+C)
cleanup-qc-system.bat
```

**What It Does:**
1. Deletes RFIs without production log links
2. Resets orphaned QC statuses to "Not Required"
3. Generates cleanup report

**Expected Output:**
```
========================================
QC System Cleanup Script
========================================

Step 1: Deleting broken RFIs...
Found 24 total RFIs
Found 24 broken RFIs (no production logs linked)
  ✓ Deleted RFI RFI-2025-0001
  ✓ Deleted RFI RFI-2025-0002
  ...
✅ Deletion completed!
   Deleted: 24 broken RFIs

Step 2: Cleaning up orphaned QC statuses...
Found 50 production logs with QC status
  ✓ Reset production log abc123 (no RFI found)
  ...
✅ Cleanup completed!
   Reset: 50 production logs
```

---

### 2. Delete Broken RFIs

**File:** `scripts/delete-broken-rfis.ts`

**Purpose:** Remove RFIs that have no production log links

**Usage:**
```bash
npx tsx scripts/delete-broken-rfis.ts
```

**Logic:**
```typescript
1. Find all RFIs
2. Check productionLogs.length === 0
3. Delete broken RFIs
4. Report count deleted
```

**Safe to Run:** Yes, only deletes broken records

---

### 3. Cleanup Orphaned QC Status

**File:** `scripts/cleanup-orphaned-qc-status.ts`

**Purpose:** Reset QC statuses for production logs without active RFIs

**Usage:**
```bash
npx tsx scripts/cleanup-orphaned-qc-status.ts
```

**Logic:**
```typescript
1. Find production logs with QC status (Pending/Approved/Rejected)
2. Check if linked to active RFI
3. If no RFI: Reset to "Not Required", set qcRequired = false
4. If has RFI: Keep status
5. Report counts
```

**Safe to Run:** Yes, only resets orphaned statuses

---

### 4. Schema Migration

**File:** `migrate-rfi-many-to-many.bat`

**Purpose:** Migrate from old single-log RFI to many-to-many structure

**When to Run:** One-time during schema upgrade

**Usage:**
```bash
# Stop dev server first
migrate-rfi-many-to-many.bat
```

**Steps:**
1. Push schema changes (`npx prisma db push`)
2. Generate Prisma client (`npx prisma generate`)
3. Run migration script (`npx tsx scripts/migrate-rfi-to-many-to-many.ts`)

**What It Migrates:**
- Copies processType from production log to RFI
- Creates junction table entries
- Preserves all RFI data

---

## Running Scripts Safely

### Pre-Run Checklist
- [ ] Stop development server (Ctrl+C)
- [ ] Backup database (if production)
- [ ] Review script purpose
- [ ] Check expected output

### Post-Run Checklist
- [ ] Review console output
- [ ] Check for errors
- [ ] Verify data integrity
- [ ] Restart development server
- [ ] Test affected features

## Script Maintenance

### Adding New Scripts

**Location:** `/scripts/` directory

**Naming Convention:**
- Use kebab-case: `cleanup-something.ts`
- Descriptive names
- Add `.bat` wrapper for Windows

**Template:**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function scriptName() {
  console.log('Starting...');
  
  try {
    // Your logic here
    
    console.log('✅ Completed!');
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

scriptName()
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Batch File Template:**
```batch
@echo off
echo ========================================
echo Script Name
echo ========================================
echo.
echo Description of what this does
echo.
pause

echo Running script...
call npx tsx scripts/your-script.ts
if %errorlevel% neq 0 (
    echo Error: Script failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo Completed successfully!
echo ========================================
pause
```

### Documentation Requirements
- Add to this file
- Include purpose, usage, and expected output
- Note when to run
- Specify if safe to run in production

## Troubleshooting

### Script Won't Run

**Error:** "Cannot find module"
```bash
# Solution: Install dependencies
npm install
```

**Error:** "Prisma Client not generated"
```bash
# Solution: Generate Prisma Client
npx prisma generate
```

**Error:** "Database connection failed"
```bash
# Solution: Check .env file and database status
```

### Script Runs But No Changes

**Check:**
1. Database connection
2. Data actually exists to clean
3. Console output for details
4. Prisma schema is up to date

### Script Fails Midway

**Recovery:**
1. Check console error message
2. Verify database state
3. May need to run again (scripts are idempotent)
4. Contact dev team if data corruption

## Scheduled Maintenance

### Daily
- Monitor system logs
- Check for failed operations

### Weekly
- Review RFI creation/approval rates
- Check for pending inspections

### Monthly
- Run `cleanup-qc-system.bat`
- Review database size
- Archive old records (future)

### Quarterly
- Full database backup
- Performance review
- Update documentation

## Emergency Procedures

### Data Corruption Detected
1. Stop all services immediately
2. Backup current database state
3. Run cleanup scripts
4. Verify data integrity
5. Restore from backup if needed

### Performance Issues
1. Check database indexes
2. Review slow queries
3. Run cleanup scripts
4. Consider archiving old data

---

**Related Documentation:**
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Database Schema](../technical/DATABASE_SCHEMA.md)
