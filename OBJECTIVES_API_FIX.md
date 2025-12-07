# Objectives API 500 Error - Fix Guide

## Issue
The `/api/business-planning/objectives` endpoint is returning a 500 Internal Server Error in production, causing the frontend to fail with `t.filter is not a function`.

## Root Cause
The API is likely failing due to one of these reasons:
1. **Prisma Client Connection Pool Exhaustion** (MOST LIKELY) - Creating new PrismaClient on every request
2. Database migration not applied in production
3. Prisma client not regenerated after schema changes
4. Database connection issue
5. Missing or corrupted data

## Fixes Applied

### 1. Frontend Error Handling (✓ Fixed)
**File**: `src/app/business-planning/objectives/page.tsx`

- Added proper error checking for API responses
- Ensured `objectives` state is always an array to prevent `.filter()` errors
- Added user-friendly error toast notifications

### 2. Enhanced API Logging (✓ Fixed)
**File**: `src/app/api/business-planning/objectives/route.ts`

- Added detailed console logging to track query execution
- Enhanced error messages with stack traces
- Returns error details in response for debugging

### 3. Prisma Client Singleton (✓ CRITICAL FIX)
**File**: `src/lib/prisma.ts`

- Created a singleton Prisma client to prevent connection pool exhaustion
- This is a **critical fix** that prevents creating new database connections on every request
- Updated objectives API to use the singleton

**Important**: All API routes should use this singleton pattern. Run `scripts/fix-prisma-imports.bat` to update all routes.

### 4. Diagnostic Script (✓ Created)
**File**: `scripts/test-objectives-api.js`

Created a test script to diagnose database issues.

## Production Deployment Steps

### Step 1: Check Server Logs
SSH into your production server and check the application logs:

```bash
# If using PM2
pm2 logs

# Or check Next.js logs
tail -f /path/to/your/app/.next/server.log
```

Look for the `[Objectives API]` log entries to see the exact error.

### Step 2: Verify Database Migration
Ensure all migrations are applied:

```bash
cd /var/www/ots  # or your app directory
npx prisma migrate deploy
```

### Step 3: Regenerate Prisma Client
The Prisma client might be out of sync:

```bash
npx prisma generate
```

### Step 4: Test Database Connection
Run the diagnostic script:

```bash
node scripts/test-objectives-api.js
```

This will:
- Test database connection
- Verify the CompanyObjective table exists
- Run the exact query used by the API
- Show any errors with details

### Step 5: Check Database Tables
Verify the tables exist:

```bash
npx prisma studio
# Or use MySQL client
mysql -u your_user -p your_database
SHOW TABLES LIKE '%objective%';
DESCRIBE company_objectives;
```

### Step 6: Restart the Application
After applying fixes:

```bash
# If using PM2
pm2 restart all

# Or if using systemd
sudo systemctl restart your-app-name
```

## Quick Fix Commands (Production)

Run these commands on your production server:

```bash
# Navigate to app directory
cd /var/www/ots

# Pull latest code changes (includes Prisma singleton fix)
git pull origin main

# Install dependencies (if needed)
npm install

# Apply migrations
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate

# Rebuild Next.js with the new Prisma singleton
npm run build

# Restart application
pm2 restart all
```

**IMPORTANT**: The Prisma singleton fix (`src/lib/prisma.ts`) is critical. Make sure to pull the latest code before rebuilding.

## Verification

After applying fixes, test the endpoint:

```bash
# From server
curl -X GET "http://localhost:3000/api/business-planning/objectives?year=2025"

# From browser
https://ots.hexasteel.sa/api/business-planning/objectives?year=2025
```

Expected response: JSON array of objectives (can be empty `[]`)

## Common Issues

### Issue: "Table 'company_objectives' doesn't exist"
**Solution**: Run migrations
```bash
npx prisma migrate deploy
```

### Issue: "Invalid `prisma.companyObjective.findMany()` invocation"
**Solution**: Regenerate Prisma client
```bash
npx prisma generate
npm run build
```

### Issue: "Cannot find module '@prisma/client'"
**Solution**: Reinstall dependencies
```bash
npm install
npx prisma generate
```

### Issue: Database connection timeout
**Solution**: Check DATABASE_URL in production .env file
```bash
cat .env | grep DATABASE_URL
```

## Testing Locally

To test the fix locally before deploying:

1. Run the diagnostic script:
```bash
node scripts/test-objectives-api.js
```

2. Start the dev server:
```bash
npm run dev
```

3. Visit: http://localhost:3000/business-planning/objectives

## Next Steps

1. **Immediate**: Apply the production fixes above
2. **Monitor**: Check server logs after deployment
3. **Verify**: Test the objectives page in production
4. **Document**: Note any additional errors in server logs

## Support

If the issue persists after following these steps:
1. Check server logs for the detailed error message
2. Run the diagnostic script and share the output
3. Verify database connectivity and table structure
