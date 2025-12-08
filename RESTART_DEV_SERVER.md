# Fix for 404 Errors on Project Dashboard API Routes

## Problem
The API routes exist but Next.js dev server is returning 404 errors.

## Solution

### Step 1: Stop the Dev Server
Press `Ctrl+C` in the terminal running the dev server.

### Step 2: Clear Next.js Cache
Run one of these commands:

**Option A (Recommended):**
```bash
npm run dev -- --turbo
```

**Option B (If Option A doesn't work):**
```bash
# Delete .next directory
Remove-Item -Recurse -Force .next

# Restart dev server
npm run dev
```

### Step 3: Hard Refresh Browser
Once the server restarts:
1. Open the dashboard page
2. Press `Ctrl+Shift+R` (hard refresh)
3. Or open DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

## Verification

All these API routes should work:
- http://localhost:3000/api/projects/[YOUR_PROJECT_ID]/summary
- http://localhost:3000/api/projects/[YOUR_PROJECT_ID]/wps
- http://localhost:3000/api/projects/[YOUR_PROJECT_ID]/itp
- http://localhost:3000/api/projects/[YOUR_PROJECT_ID]/production
- http://localhost:3000/api/projects/[YOUR_PROJECT_ID]/qc
- http://localhost:3000/api/projects/[YOUR_PROJECT_ID]/buildings
- http://localhost:3000/api/projects/[YOUR_PROJECT_ID]/documents
- http://localhost:3000/api/projects/[YOUR_PROJECT_ID]/tasks

## Why This Happens

Next.js dev server sometimes doesn't detect new API routes created while it's running, especially with dynamic routes like `[projectId]`. A restart forces it to re-scan all routes.

## If Still Not Working

1. Check that files exist in correct location:
   ```
   src/app/api/projects/[projectId]/summary/route.ts
   src/app/api/projects/[projectId]/wps/route.ts
   ... etc
   ```

2. Verify no TypeScript errors:
   ```bash
   npm run build
   ```

3. Try production build:
   ```bash
   npm run build
   npm run start
   ```
