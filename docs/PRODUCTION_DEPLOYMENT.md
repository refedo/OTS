# Production Server Deployment Guide

## Overview

This guide explains how to use the new GitHub release system to deploy updates to your production server.

## Important: No Release Folders on GitHub

**GitHub releases work differently from Dolibarr:**

- **Dolibarr**: Creates physical folders (e.g., `/releases/v1.0.0/`, `/releases/v2.0.0/`)
- **GitHub**: Uses **tags** and **releases** - no physical folders needed
- **Benefit**: Cleaner repository, easier to manage, industry standard

### How GitHub Releases Work

```
Your Repository
├── src/
├── public/
├── package.json
└── .github/
    └── workflows/
        └── release.yml

When you push a tag (v2.10.0):
    ↓
GitHub Actions runs automatically
    ↓
Creates a Release with:
    - Deployment package (.tar.gz)
    - Deployment instructions
    - Changelog excerpt
    ↓
Available at: github.com/refedo/OTS/releases/tag/v2.10.0
```

**No folders are created in your repository!** Everything is managed through GitHub's release system.

## Complete Deployment Workflow

### Step 1: Create a Release (Developer)

**You decide the version bump type based on your changes:**

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Bug fixes, patches | `patch` | 2.9.0 → 2.9.1 |
| New features, modules | `minor` | 2.9.0 → 2.10.0 |
| Breaking changes | `major` | 2.9.0 → 3.0.0 |

**Commands:**

```bash
# 1. Bump version (YOU choose: patch/minor/major)
node scripts/version-manager.js minor

# 2. Edit CHANGELOG.md with your changes
nano CHANGELOG.md

# 3. Commit
git add .
git commit -m "chore: release v2.10.0"

# 4. Create tag
git tag -a v2.10.0 -m "Release v2.10.0"

# 5. Push (triggers GitHub Actions)
git push origin main --tags
```

**Result:** GitHub automatically creates a release at `https://github.com/refedo/OTS/releases/tag/v2.10.0`

### Step 2: Deploy to Production Server

#### Option A: Fresh Deployment (New Server)

```bash
# 1. Download release package
cd /tmp
wget https://github.com/refedo/OTS/releases/download/v2.10.0/hexa-steel-ots-v2.10.0.tar.gz

# 2. Create deployment directory
mkdir -p /var/www/hexasteel.sa/ots
cd /var/www/hexasteel.sa/ots

# 3. Extract
tar -xzf /tmp/hexa-steel-ots-v2.10.0.tar.gz

# 4. Install dependencies
npm ci --production

# 5. Configure environment
cp .env.example .env
nano .env  # Edit with your database credentials, etc.

# 6. Run migrations
npx prisma migrate deploy

# 7. Start application
pm2 start npm --name "ots-app" -- start
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

#### Option B: Update Existing Deployment

```bash
# 1. Backup current version
cd /var/www/hexasteel.sa
tar -czf ots-backup-$(date +%Y%m%d-%H%M%S).tar.gz ots/

# 2. Stop application
pm2 stop ots-app

# 3. Download new release
cd /tmp
wget https://github.com/refedo/OTS/releases/download/v2.10.0/hexa-steel-ots-v2.10.0.tar.gz

# 4. Extract to deployment directory
cd /var/www/hexasteel.sa/ots
tar -xzf /tmp/hexa-steel-ots-v2.10.0.tar.gz

# 5. Install dependencies
npm ci --production

# 6. Run migrations
npx prisma migrate deploy

# 7. Restart application
pm2 restart ots-app
pm2 save

# 8. Verify deployment
pm2 logs ots-app --lines 50
```

#### Option C: Zero-Downtime Deployment (Advanced)

```bash
# 1. Download and extract to new directory
cd /var/www/hexasteel.sa
mkdir ots-v2.10.0
cd ots-v2.10.0
wget https://github.com/refedo/OTS/releases/download/v2.10.0/hexa-steel-ots-v2.10.0.tar.gz
tar -xzf hexa-steel-ots-v2.10.0.tar.gz

# 2. Copy environment file
cp ../ots/.env .env

# 3. Install and migrate
npm ci --production
npx prisma migrate deploy

# 4. Start new instance on different port
PORT=3001 pm2 start npm --name "ots-app-new" -- start

# 5. Test new instance
curl http://localhost:3001/api/health

# 6. Switch (update nginx/load balancer to point to new port)
# Then stop old instance
pm2 stop ots-app
pm2 delete ots-app

# 7. Rename new instance
pm2 restart ots-app-new --name ots-app
pm2 save
```

### Step 3: Verify Deployment

```bash
# Check application status
pm2 status

# View logs
pm2 logs ots-app --lines 100

# Check version
curl http://localhost:3000/api/health
# Or visit: http://your-domain.com/changelog

# Monitor for errors
pm2 monit
```

## Rollback Procedure

If something goes wrong:

### Quick Rollback (Restore Backup)

```bash
# 1. Stop current version
pm2 stop ots-app

# 2. Restore backup
cd /var/www/hexasteel.sa
rm -rf ots/
tar -xzf ots-backup-20251224-103000.tar.gz

# 3. Restart
pm2 restart ots-app
```

### Rollback to Previous Release

```bash
# 1. Stop application
pm2 stop ots-app

# 2. Download previous version
cd /tmp
wget https://github.com/refedo/OTS/releases/download/v2.9.0/hexa-steel-ots-v2.9.0.tar.gz

# 3. Extract
cd /var/www/hexasteel.sa/ots
tar -xzf /tmp/hexa-steel-ots-v2.9.0.tar.gz

# 4. Install dependencies
npm ci --production

# 5. Rollback database (if schema changed)
# Check migration history
npx prisma migrate status

# If needed, rollback specific migration
npx prisma migrate resolve --rolled-back 20251224_migration_name

# 6. Restart
pm2 restart ots-app
```

## Version Tracking

### Current Version Locations

After deployment, verify version consistency:

1. **UI (Sidebar Footer)**: Should show `v2.10.0`
2. **Login Page**: Should show `v2.10.0`
3. **Changelog Page**: Should show `v2.10.0` as latest
4. **package.json**: Should show `"version": "2.10.0"`

### Check Version on Server

```bash
# Check package.json version
cat /var/www/hexasteel.sa/ots/package.json | grep version

# Check running application
curl http://localhost:3000/api/health | jq .version
```

## Automated Deployment (Optional)

### Using GitHub Actions for Auto-Deploy

You can extend `.github/workflows/deploy.yml` to automatically deploy to production when a release is created:

```yaml
name: Deploy to Production

on:
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /var/www/hexasteel.sa/ots
            wget ${{ github.event.release.assets[0].browser_download_url }}
            pm2 stop ots-app
            tar -xzf hexa-steel-ots-*.tar.gz
            npm ci --production
            npx prisma migrate deploy
            pm2 restart ots-app
```

## Troubleshooting

### Issue: "Module not found" after deployment

```bash
# Clear node_modules and reinstall
cd /var/www/hexasteel.sa/ots
rm -rf node_modules
npm ci --production
pm2 restart ots-app
```

### Issue: Database migration fails

```bash
# Check migration status
npx prisma migrate status

# Force reset (CAUTION: Development only!)
npx prisma migrate reset

# Production: Manually fix and retry
npx prisma migrate deploy
```

### Issue: Application won't start

```bash
# Check logs
pm2 logs ots-app --err

# Check environment variables
cat .env

# Verify database connection
npx prisma db pull
```

### Issue: Old version still showing

```bash
# Clear Next.js cache
rm -rf .next

# Rebuild (if needed)
npm run build

# Hard restart PM2
pm2 delete ots-app
pm2 start npm --name "ots-app" -- start
pm2 save
```

## Best Practices

### Before Deployment

- [ ] Test changes locally
- [ ] Run database migrations in development
- [ ] Update CHANGELOG.md with all changes
- [ ] Verify version numbers are consistent
- [ ] Create backup of production database
- [ ] Notify team of deployment window

### During Deployment

- [ ] Use maintenance mode if available
- [ ] Monitor logs in real-time
- [ ] Test critical functionality immediately
- [ ] Keep rollback backup ready

### After Deployment

- [ ] Verify version in UI
- [ ] Test key features
- [ ] Monitor error logs for 30 minutes
- [ ] Update team on deployment status
- [ ] Document any issues encountered

## Maintenance Windows

Recommended deployment times:
- **Best**: Off-peak hours (e.g., 2:00 AM - 4:00 AM)
- **Good**: Weekends or holidays
- **Avoid**: Peak business hours (9:00 AM - 5:00 PM)

## Emergency Contacts

In case of deployment issues:
- **Developer**: [Your contact]
- **DevOps**: [DevOps contact]
- **Database Admin**: [DBA contact]

## Summary

**Key Points:**
1. GitHub releases use **tags**, not physical folders
2. **You decide** version bump type (patch/minor/major)
3. Download release packages from GitHub
4. Always backup before deploying
5. Test after deployment
6. Keep rollback backup for 30 days

**Quick Deploy Command:**
```bash
wget [release-url] && pm2 stop ots-app && tar -xzf *.tar.gz && npm ci --production && npx prisma migrate deploy && pm2 restart ots-app
```

---

For more details, see:
- `RELEASE_QUICK_START.md` - Quick reference
- `docs/RELEASE_MANAGEMENT.md` - Complete guide
- GitHub Releases: `https://github.com/refedo/OTS/releases`
