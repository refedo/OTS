# Troubleshooting Dashboard 404 Errors

## Issue
Getting 404 errors for all project dashboard API endpoints despite files existing.

## Root Cause
Next.js 15.5.4 with Turbopack sometimes doesn't detect newly created dynamic API routes until the dev server is fully restarted.

---

## Solution Steps

### Step 1: Stop All Node Processes
```powershell
# Stop all node processes
Stop-Process -Name "node" -Force

# Or manually press Ctrl+C in the terminal running dev server
```

### Step 2: Clear Next.js Cache
```powershell
# Delete .next directory
Remove-Item -Recurse -Force .next

# Delete Turbopack cache (if exists)
Remove-Item -Recurse -Force .turbopack
```

### Step 3: Restart Dev Server
```bash
npm run dev
```

### Step 4: Test API Routes
Once server is running, test the routes:

```bash
node test-api-routes.js
```

Or manually test in browser:
```
http://localhost:3000/api/projects/YOUR_PROJECT_ID/summary
```

### Step 5: Hard Refresh Browser
- Press `Ctrl+Shift+R`
- Or F12 → Network tab → Disable cache checkbox → Refresh

---

## Alternative: Use Webpack Instead of Turbopack

If Turbopack continues to have issues, temporarily switch to Webpack:

### Option 1: Modify package.json
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:turbo": "next dev --turbo"
  }
}
```

Then run: `npm run dev` (without --turbo flag)

### Option 2: Create next.config.js override
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable turbopack for development
  // Remove this after routes are working
};

module.exports = nextConfig;
```

---

## Verification Checklist

- [ ] All node processes stopped
- [ ] .next directory deleted
- [ ] Dev server restarted
- [ ] Browser cache cleared
- [ ] API routes return 200 (not 404)
- [ ] Dashboard loads without errors

---

## If Still Not Working

### Check 1: Verify Files Exist
```powershell
Get-ChildItem -Path "src\app\api\projects" -Recurse -Filter "route.ts" | 
  Where-Object { $_.Directory.Parent.Name -match 'projectId' } | 
  Select-Object FullName
```

Should show 8 route.ts files.

### Check 2: Check for TypeScript Errors
```bash
npm run build
```

Fix any TypeScript errors before continuing.

### Check 3: Try Production Build
```bash
npm run build
npm run start
```

If it works in production but not development, it's a Turbopack issue.

### Check 4: Verify Route Structure
Each route file should be at:
```
src/app/api/projects/[projectId]/{endpoint}/route.ts
```

NOT:
```
src/app/api/projects/%5BprojectId%5D/{endpoint}/route.ts
```

---

## Known Issues

### Issue: Turbopack + Dynamic Routes
**Symptom:** New dynamic routes return 404 until server restart  
**Solution:** Always restart dev server after creating new dynamic routes

### Issue: Windows File System
**Symptom:** Square brackets in folder names cause issues  
**Solution:** Ensure folder is named `[projectId]` not `%5BprojectId%5D`

### Issue: Browser Cache
**Symptom:** Routes work in new incognito window but not regular window  
**Solution:** Hard refresh or clear browser cache

---

## Quick Commands Reference

```powershell
# Full reset
Stop-Process -Name "node" -Force
Remove-Item -Recurse -Force .next
npm run dev

# Test routes
node test-api-routes.js

# Check route files
Get-ChildItem -Path "src\app\api\projects\[projectId]" -Recurse -Filter "route.ts"
```

---

## Success Indicators

When working correctly, you should see:
- ✅ No 404 errors in browser console
- ✅ Dashboard loads with real data
- ✅ All widgets display information
- ✅ No "Failed to fetch" errors

---

## Need More Help?

1. Check Next.js GitHub issues for Turbopack + dynamic routes
2. Try disabling Turbopack temporarily
3. Verify Node.js version is compatible (18.17+)
4. Check for conflicting route definitions

---

**Last Updated:** December 9, 2024  
**Next.js Version:** 15.5.4 (Turbopack)
