# ⚠️ FIX 500 ERROR - DO THIS NOW!

## The Problem
The WorkOrder and WorkOrderPart tables don't exist in your database yet.

## The Solution (2 Steps)

### Step 1: Open NEW Terminal
**IMPORTANT**: Don't close your current dev server!

1. Open a NEW terminal/command prompt
2. Navigate to your project:
   ```bash
   cd C:\Users\Walid\CascadeProjects\mrp
   ```

### Step 2: Run Migration
In the NEW terminal, run:

```bash
npx prisma migrate dev --name add_work_order_module
```

**OR** just double-click:
```
migrate-work-orders.bat
```

### Step 3: Generate Prisma Client
```bash
npx prisma generate
```

### Step 4: Restart Dev Server
Go back to your original terminal and:
1. Press `Ctrl+C` to stop the server
2. Run `npm run dev` to restart

## What You'll See

### During Migration
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": MySQL database

Applying migration `add_work_order_module`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20251211_add_work_order_module/
    └─ migration.sql

✔ Generated Prisma Client
```

### After Success
- ✅ No more 500 errors
- ✅ Work orders will create successfully
- ✅ Tables created: WorkOrder, WorkOrderPart

## Quick Verification

After migration, check your database:

```sql
SHOW TABLES LIKE 'WorkOrder%';
```

Should show:
- WorkOrder
- WorkOrderPart

## Still Getting 500 Error?

### Check 1: Migration Ran?
Look for new folder:
```
prisma/migrations/[timestamp]_add_work_order_module/
```

### Check 2: Tables Exist?
Connect to your database and run:
```sql
DESCRIBE WorkOrder;
DESCRIBE WorkOrderPart;
```

### Check 3: Prisma Client Updated?
```bash
npx prisma generate
```

### Check 4: Server Restarted?
Make sure you restarted the dev server after migration!

## Common Issues

### "Migration already exists"
If you see this, the migration file exists but wasn't applied:
```bash
npx prisma migrate deploy
```

### "Cannot find module '@prisma/client'"
```bash
npm install @prisma/client
npx prisma generate
```

### "Database connection failed"
Check your `.env` file has correct DATABASE_URL

## After Migration Works

Test by:
1. Go to Production → Work Orders → Create Work Order
2. Complete all steps
3. Click "Create Work Order"
4. Should succeed! ✅

---

**Need Help?** The migration MUST run before work orders will work!
