# Fix Dashboard Widgets Error - Quick Solution

## Problem
The dashboard widgets API is returning 500 errors because the Prisma client doesn't have the `UserDashboardWidget` model yet.

## Solution

### Option 1: Quick Fix (Recommended)
1. **Stop the development server** (Ctrl+C in terminal)
2. Run these commands:
```bash
npx prisma generate
npm run dev
```

### Option 2: Database Push (If migration fails)
1. **Stop the development server**
2. Run:
```bash
npx prisma db push
npx prisma generate
npm run dev
```

### Option 3: Manual Steps
1. **Stop the development server** (IMPORTANT!)
2. Delete the `.prisma` folder:
```bash
rmdir /s /q node_modules\.prisma
```
3. Regenerate:
```bash
npx prisma generate
```
4. Start server:
```bash
npm run dev
```

## Why This Happens
- The `UserDashboardWidget` model was added to `schema.prisma`
- But Prisma client wasn't regenerated
- The API tries to use `prisma.userDashboardWidget` which doesn't exist yet
- This causes the 500 Internal Server Error

## After Fix
Once you run `prisma generate` and restart the server:
- ✅ Dashboard will load correctly
- ✅ Widgets will display
- ✅ Add/remove widget functionality will work
- ✅ All API endpoints will function

## Important Notes
1. **Must stop dev server first** - The Prisma client files are locked while server is running
2. **Database table will be created** - The `user_dashboard_widgets` table will be added
3. **No data loss** - Existing data is safe
4. **Takes ~30 seconds** - Generation is quick

## Verification
After restart, check:
1. Dashboard loads at `http://localhost:3000/dashboard`
2. No console errors
3. Widgets display with data
4. "Add Widget" button works

---

**TL;DR:** Stop server → Run `npx prisma generate` → Start server
