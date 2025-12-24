# GitHub Release Management - Quick Start

## 🚀 TL;DR - Release in 5 Steps

```bash
# 1. Bump version (patch/minor/major)
node scripts/version-manager.js minor

# 2. Edit CHANGELOG.md with release notes
nano CHANGELOG.md

# 3. Commit changes
git add .
git commit -m "chore: release v2.10.0"

# 4. Create and push tag
git tag -a v2.10.0 -m "Release v2.10.0"
git push origin main --tags

# 5. GitHub Actions creates release automatically! 🎉
```

## Current System State

### Version Locations
- **package.json**: `1.1.0` (source of truth)
- **CHANGELOG.md**: `2.9.0` (user-facing version)
- **UI Components**: `v2.9.0` (sidebar, login page)

### Files That Show Version
1. `package.json` - NPM version
2. `CHANGELOG.md` - Release history
3. `src/components/app-sidebar.tsx` - Footer version
4. `src/components/login-form.tsx` - Login page version

## What We Built

### 1. Version Manager Script
**File:** `scripts/version-manager.js`

Automatically updates all version references:
- ✅ package.json
- ✅ CHANGELOG.md (creates new entry)
- ✅ app-sidebar.tsx
- ✅ login-form.tsx

### 2. GitHub Release Workflow
**File:** `.github/workflows/release.yml`

Triggered by version tags (v*.*.*), automatically:
- ✅ Builds the application
- ✅ Creates release package (.tar.gz)
- ✅ Extracts changelog for this version
- ✅ Creates GitHub Release with:
  - Release notes
  - Deployment package
  - Deployment instructions
- ✅ Uploads artifacts (90-day retention)

### 3. Release Structure

Each GitHub release includes:
```
releases/
├── hexa-steel-ots-v2.10.0.tar.gz    # Complete deployment package
└── DEPLOYMENT-v2.10.0.md            # Step-by-step deployment guide
```

Package contains:
- `.next/` - Built application
- `public/` - Static assets
- `prisma/` - Database schema & migrations
- `package.json` - Dependencies
- `.env.example` - Environment template

## How It Works

### Version Consistency Flow

```
version-manager.js
       ↓
Updates 4 files simultaneously
       ↓
package.json → 2.10.0
CHANGELOG.md → [2.10.0] - 2025-12-24
app-sidebar.tsx → v2.10.0
login-form.tsx → v2.10.0
       ↓
Git tag: v2.10.0
       ↓
GitHub Actions detects tag
       ↓
Builds & creates release
       ↓
Release available on GitHub
```

### Why This Prevents Hallucination

**Problem:** Manual updates lead to version mismatches
- Developer updates package.json to 2.10.0
- Forgets to update sidebar (still shows 2.9.0)
- CHANGELOG says 2.11.0
- Complete confusion! 😵

**Solution:** Automated single source of truth
- Script updates ALL files at once
- Git tag enforces version number
- GitHub Actions validates tag format
- Changelog extracted automatically
- **Impossible to have version mismatch!** ✅

## Semantic Versioning Guide

```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └─ Bug fixes (2.9.0 → 2.9.1)
  │     └─────── New features (2.9.0 → 2.10.0)
  └───────────── Breaking changes (2.9.0 → 3.0.0)
```

**Examples:**
- `patch`: Fixed RBAC permission bug → 2.9.0 → 2.9.1
- `minor`: Added Knowledge Center module → 2.9.0 → 2.10.0
- `major`: Redesigned entire database schema → 2.9.0 → 3.0.0

## Complete Release Example

### Scenario: Adding PTS Sync Improvements

```bash
# 1. Develop feature
git add .
git commit -m "feat: add PTS sync corruption detection and rollback"

# 2. Bump version (new feature = minor)
node scripts/version-manager.js minor
# Output: Bumping version from 2.9.0 to 2.10.0

# 3. Edit CHANGELOG.md
nano CHANGELOG.md
```

Add to CHANGELOG.md:
```markdown
## [2.10.0] - 2025-12-24

### Added
- PTS Sync: Show corrupted items that were not synced
- PTS Sync: Add rollback option per project
- PTS Sync: Show completion % per synced project

### Changed
- Enhanced confirmation dialog design system-wide

### Fixed
- RBAC permission filtering in navigation sidebar
```

```bash
# 4. Commit version changes
git add .
git commit -m "chore: release v2.10.0"

# 5. Create tag
git tag -a v2.10.0 -m "Release v2.10.0"

# 6. Push everything
git push origin main --tags

# 7. Wait ~5 minutes for GitHub Actions
# Check: https://github.com/your-org/hexa-steel-ots/actions

# 8. Release is ready!
# Download: https://github.com/your-org/hexa-steel-ots/releases/tag/v2.10.0
```

## Deployment

### Quick Deploy (New Server)

```bash
# Download release
wget https://github.com/your-org/hexa-steel-ots/releases/download/v2.10.0/hexa-steel-ots-v2.10.0.tar.gz

# Extract
mkdir -p /var/www/hexasteel.sa/ots
tar -xzf hexa-steel-ots-v2.10.0.tar.gz -C /var/www/hexasteel.sa/ots
cd /var/www/hexasteel.sa/ots

# Setup
npm ci --production
cp .env.example .env
nano .env  # Configure

# Database
npx prisma migrate deploy

# Start
pm2 start npm --name "ots-app" -- start
pm2 save
```

### Update Existing

```bash
# Backup
cd /var/www/hexasteel.sa
tar -czf ots-backup-$(date +%Y%m%d).tar.gz ots/

# Stop
pm2 stop ots-app

# Update
cd ots
wget https://github.com/your-org/hexa-steel-ots/releases/download/v2.10.0/hexa-steel-ots-v2.10.0.tar.gz
tar -xzf hexa-steel-ots-v2.10.0.tar.gz

# Install & migrate
npm ci --production
npx prisma migrate deploy

# Restart
pm2 restart ots-app
```

### Rollback

```bash
# Stop current
pm2 stop ots-app

# Restore backup
cd /var/www/hexasteel.sa
rm -rf ots/
tar -xzf ots-backup-20251224.tar.gz

# Restart
pm2 restart ots-app
```

## Troubleshooting

### "Tag already exists"
```bash
git tag -d v2.10.0                    # Delete local
git push origin :refs/tags/v2.10.0    # Delete remote
git tag -a v2.10.0 -m "Release v2.10.0"
git push origin v2.10.0
```

### "Version mismatch detected"
```bash
# Check all versions
node scripts/version-manager.js current

# Force sync
node scripts/version-manager.js patch  # Bumps to next patch
```

### "GitHub Action failed"
1. Check Actions tab on GitHub
2. Verify tag format: `v2.10.0` (must start with 'v')
3. Check build logs for errors
4. Ensure GITHUB_TOKEN secret exists

## Best Practices

### ✅ DO
- Use version-manager script for all version changes
- Document all changes in CHANGELOG.md
- Test features before releasing
- Create tags from main branch only
- Keep release notes clear and concise
- Backup before deploying

### ❌ DON'T
- Manually edit version numbers
- Skip changelog updates
- Create tags without commits
- Deploy without testing
- Delete old releases (keep last 3)
- Push directly to production

## For Future Modules

When adding new modules, remember to:
1. Add to permission system (see `PERMISSION_SYSTEM_GUIDE.md`)
2. Document in CHANGELOG.md
3. Update version appropriately
4. Test thoroughly before release

## Quick Commands Reference

```bash
# Version management
node scripts/version-manager.js current  # Show current version
node scripts/version-manager.js patch    # Bug fix release
node scripts/version-manager.js minor    # Feature release
node scripts/version-manager.js major    # Breaking change

# Git operations
git tag -a v2.10.0 -m "Release v2.10.0"  # Create tag
git push origin main --tags              # Push with tags
git tag -l                               # List tags
git show v2.10.0                         # Show tag details

# Deployment
pm2 restart ots-app                      # Restart app
pm2 logs ots-app                         # View logs
pm2 status                               # Check status
npx prisma migrate deploy                # Run migrations
```

## Support

- **Full Documentation**: `docs/RELEASE_MANAGEMENT.md`
- **Permission Guide**: `docs/PERMISSION_SYSTEM_GUIDE.md`
- **GitHub Actions**: `.github/workflows/release.yml`
- **Version Script**: `scripts/version-manager.js`

---

**Remember:** The version-manager script is your friend! It prevents version hallucination by updating everything at once. 🎯
