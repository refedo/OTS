# Deployment Fix Guide - Server Action Error Resolution

## Problem Summary

When deploying to production, you encountered two main issues:

1. **Git Merge Conflict**: Local `package.json` and `package-lock.json` differ from remote
2. **Server Action Error**: `Failed to find Server Action "40954a7c52f33aa78e62805bfc662c68df3c8b43f1"`

## Root Cause

The Server Action error occurs because:
- Next.js generates unique IDs for Server Actions during build
- Browser cache contains old Server Action IDs from previous deployment
- New deployment has different Server Action IDs
- Browser tries to call old IDs that no longer exist

## Immediate Fix - Run These Commands on Server

```bash
# Navigate to app directory
cd /var/www/hexasteel.sa/ots

# Stash local changes to avoid merge conflicts
git stash

# Pull latest changes
git pull origin main

# Reinstall dependencies (clean install)
rm -rf node_modules package-lock.json
npm install

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build application
npm run build

# Delete and restart PM2 process (clears internal cache)
pm2 delete ots-app
pm2 start npm --name "ots-app" -- start

# Monitor logs
pm2 logs ots-app --lines 50
```

## Alternative: Use Quick Deploy Script

```bash
# Upload quick-deploy.sh to server
scp quick-deploy.sh root@hexasteel:/var/www/hexasteel.sa/ots/

# SSH to server
ssh root@hexasteel

# Make executable and run
cd /var/www/hexasteel.sa/ots
chmod +x quick-deploy.sh
./quick-deploy.sh
```

## Client-Side Fix (CRITICAL)

After deployment, **all users must clear their browser cache**:

### Method 1: Hard Refresh
- **Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

### Method 2: Clear Cache
- Chrome: Settings → Privacy → Clear browsing data → Cached images and files
- Firefox: Settings → Privacy → Clear Data → Cached Web Content
- Safari: Develop → Empty Caches

### Method 3: Incognito/Private Mode
- Open site in incognito/private browsing mode to test

## Prevention - Add Cache Headers

To prevent this issue in future deployments, we should add proper cache headers for Server Actions.

### Update `next.config.mjs`

Add cache control headers to prevent browser from caching Server Actions:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config
  
  async headers() {
    return [
      {
        // Prevent caching of Server Actions
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

## Best Practices for Future Deployments

### 1. Always Use PM2 Reload (Not Restart)

```bash
# ❌ BAD - Causes downtime and cache issues
pm2 restart ots-app

# ✅ GOOD - Zero downtime, proper cache clearing
pm2 reload ots-app --update-env
```

### 2. Handle Git Conflicts Properly

```bash
# If you have local changes that should be discarded
git stash
git pull origin main

# If you have local changes that should be kept
git stash
git pull origin main
git stash pop
# Resolve conflicts manually
```

### 3. Complete Deployment Sequence

```bash
# 1. Backup database (optional but recommended)
mysqldump -u user -p database > backup_$(date +%Y%m%d).sql

# 2. Pull code
git stash && git pull origin main

# 3. Install dependencies
npm ci

# 4. Generate Prisma
npx prisma generate

# 5. Run migrations
npx prisma migrate deploy

# 6. Build
npm run build

# 7. Reload (not restart)
pm2 reload ots-app --update-env

# 8. Verify
pm2 logs ots-app --lines 20
curl http://localhost:3000/api/health
```

## Monitoring After Deployment

```bash
# Check PM2 status
pm2 status

# Monitor logs in real-time
pm2 logs ots-app

# Check for errors
pm2 logs ots-app --err

# View last 100 lines
pm2 logs ots-app --lines 100 --nostream
```

## Troubleshooting

### Issue: "Failed to find Server Action" persists

**Solution**: 
1. Verify build completed successfully: `ls -la .next/server/app/`
2. Clear PM2 cache: `pm2 delete ots-app && pm2 start npm --name "ots-app" -- start`
3. Clear browser cache completely
4. Try incognito mode

### Issue: Git merge conflicts

**Solution**:
```bash
# Discard local changes
git checkout -- package.json package-lock.json
git pull origin main

# OR keep local changes
git stash
git pull origin main
git stash pop
```

### Issue: Build fails with memory error

**Solution**:
```bash
# Already configured in package.json:
# "build": "cross-env NODE_OPTIONS=--max-old-space-size=4096 next build"

# If still failing, increase memory:
export NODE_OPTIONS=--max-old-space-size=8192
npm run build
```

### Issue: Database migration fails

**Solution**:
```bash
# Check database connection
npx prisma db pull

# Reset and reapply (CAUTION: Development only)
npx prisma migrate reset

# Production: Apply specific migration
npx prisma migrate resolve --applied "migration_name"
npx prisma migrate deploy
```

## Automated Deployment Script

For future deployments, use the existing `deploy.sh` script which handles:
- Pre-deployment checks
- Database backups
- Automatic rollback on failure
- Health checks

```bash
# Make executable
chmod +x deploy.sh

# Run deployment
./deploy.sh deploy

# Rollback if needed
./deploy.sh rollback
```

## Summary

The Server Action error is a **client-side caching issue**, not a server-side problem. The server is working correctly, but browsers are trying to use old Server Action IDs.

**Key Points**:
1. ✅ Server deployment completed successfully
2. ✅ Build generated new Server Action IDs
3. ❌ Browsers cached old Server Action IDs
4. 🔧 **Solution**: Clear browser cache or hard refresh

**After every deployment, notify all users to refresh their browsers with Ctrl+Shift+R**
