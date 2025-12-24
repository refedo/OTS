# Release Management Guide - Hexa Steel OTS

## Overview

This guide outlines the complete release management process for Hexa Steel OTS, ensuring version consistency, proper changelog maintenance, and automated GitHub releases.

## Version Management System

### Current State
- **package.json**: `1.1.0` (source of truth)
- **CHANGELOG.md**: `2.9.0` (detailed release notes)
- **UI Components**: `v2.9.0` (displayed to users)

### Semantic Versioning

We follow [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH

Example: 2.9.0
         │ │ │
         │ │ └─ PATCH: Bug fixes (backward compatible)
         │ └─── MINOR: New features (backward compatible)
         └───── MAJOR: Breaking changes
```

**When to bump:**
- **PATCH** (2.9.0 → 2.9.1): Bug fixes, security patches, minor improvements
- **MINOR** (2.9.0 → 2.10.0): New features, new modules, enhancements
- **MAJOR** (2.9.0 → 3.0.0): Breaking changes, major refactoring, API changes

## Release Process

### Step 1: Prepare Release

1. **Ensure all changes are committed:**
   ```bash
   git status
   git add .
   git commit -m "feat: your feature description"
   ```

2. **Run version manager script:**
   ```bash
   # For bug fixes
   node scripts/version-manager.js patch

   # For new features
   node scripts/version-manager.js minor

   # For breaking changes
   node scripts/version-manager.js major
   ```

   This script automatically:
   - ✅ Updates `package.json` version
   - ✅ Creates new CHANGELOG.md entry
   - ✅ Updates `app-sidebar.tsx` version display
   - ✅ Updates `login-form.tsx` version display

### Step 2: Update Changelog

Edit `CHANGELOG.md` and fill in the release notes:

```markdown
## [2.10.0] - 2025-12-24

### Added
- New Knowledge Center module for operational intelligence
- Pattern detection across projects
- Root-cause tagging system

### Changed
- Enhanced confirmation dialog design system-wide
- Improved PTS sync page with corruption detection

### Fixed
- RBAC permission filtering in navigation
- Session timeout handling
```

**Changelog Categories:**
- **Added**: New features, modules, capabilities
- **Changed**: Changes to existing functionality
- **Fixed**: Bug fixes
- **Deprecated**: Features to be removed
- **Removed**: Removed features
- **Security**: Security fixes

### Step 3: Commit Version Changes

```bash
git add .
git commit -m "chore: release v2.10.0"
```

### Step 4: Create Git Tag

```bash
# Create annotated tag
git tag -a v2.10.0 -m "Release v2.10.0"

# Verify tag
git tag -l
```

### Step 5: Push to GitHub

```bash
# Push commits and tags
git push origin main --tags
```

### Step 6: Automated Release Creation

Once you push the tag, GitHub Actions automatically:
1. ✅ Builds the application
2. ✅ Generates Prisma client
3. ✅ Creates release package (`.tar.gz`)
4. ✅ Extracts changelog for this version
5. ✅ Creates GitHub Release with:
   - Release notes from CHANGELOG.md
   - Deployment package
   - Deployment instructions
6. ✅ Uploads artifacts (retained for 90 days)

## GitHub Release Structure

Each release includes:

```
releases/
├── v2.10.0/
│   ├── .next/                    # Built application
│   ├── public/                   # Static assets
│   ├── prisma/                   # Database schema & migrations
│   ├── package.json              # Dependencies
│   ├── package-lock.json         # Locked versions
│   └── .env.example              # Environment template
├── hexa-steel-ots-v2.10.0.tar.gz # Deployment package
└── DEPLOYMENT-v2.10.0.md         # Deployment instructions
```

## Deployment Instructions

### Fresh Deployment

1. **Download release package:**
   ```bash
   wget https://github.com/your-org/hexa-steel-ots/releases/download/v2.10.0/hexa-steel-ots-v2.10.0.tar.gz
   ```

2. **Extract to deployment directory:**
   ```bash
   mkdir -p /var/www/hexasteel.sa/ots
   tar -xzf hexa-steel-ots-v2.10.0.tar.gz -C /var/www/hexasteel.sa/ots
   cd /var/www/hexasteel.sa/ots
   ```

3. **Install dependencies:**
   ```bash
   npm ci --production
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your configuration
   ```

5. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

6. **Start application:**
   ```bash
   pm2 start npm --name "ots-app" -- start
   pm2 save
   pm2 startup
   ```

### Update Existing Deployment

1. **Backup current version:**
   ```bash
   cd /var/www/hexasteel.sa
   tar -czf ots-backup-$(date +%Y%m%d).tar.gz ots/
   ```

2. **Stop application:**
   ```bash
   pm2 stop ots-app
   ```

3. **Extract new version:**
   ```bash
   cd /var/www/hexasteel.sa/ots
   wget https://github.com/your-org/hexa-steel-ots/releases/download/v2.10.0/hexa-steel-ots-v2.10.0.tar.gz
   tar -xzf hexa-steel-ots-v2.10.0.tar.gz
   ```

4. **Install dependencies:**
   ```bash
   npm ci --production
   ```

5. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

6. **Restart application:**
   ```bash
   pm2 restart ots-app
   pm2 save
   ```

## Rollback Procedure

If a release causes issues:

### 1. Quick Rollback (Same Database Schema)

```bash
# Stop current version
pm2 stop ots-app

# Restore previous backup
cd /var/www/hexasteel.sa
rm -rf ots/
tar -xzf ots-backup-YYYYMMDD.tar.gz

# Restart
pm2 restart ots-app
```

### 2. Database Rollback (If Schema Changed)

```bash
# Check migration history
npx prisma migrate status

# Rollback specific migration
npx prisma migrate resolve --rolled-back 20251224_migration_name

# Or restore database backup
mysql -u user -p database_name < backup.sql
```

### 3. Download Previous Release

```bash
# Download previous version from GitHub
wget https://github.com/your-org/hexa-steel-ots/releases/download/v2.9.0/hexa-steel-ots-v2.9.0.tar.gz

# Extract and deploy
tar -xzf hexa-steel-ots-v2.9.0.tar.gz -C /var/www/hexasteel.sa/ots
cd /var/www/hexasteel.sa/ots
npm ci --production
pm2 restart ots-app
```

## Version Consistency Checklist

Before each release, verify:

- [ ] `package.json` version matches release version
- [ ] `CHANGELOG.md` has entry for this version
- [ ] `app-sidebar.tsx` displays correct version
- [ ] `login-form.tsx` displays correct version
- [ ] All changes are documented in CHANGELOG.md
- [ ] Git tag matches version number
- [ ] No uncommitted changes
- [ ] All tests pass (if applicable)
- [ ] Database migrations are tested

## Avoiding Version Hallucination

### Problem: Inconsistent Versions
Different files showing different versions causes confusion and deployment issues.

### Solution: Single Source of Truth + Automation

1. **package.json is the source of truth**
2. **Use version-manager.js script** - Updates all files automatically
3. **Git tags enforce versioning** - Tag name must match package.json
4. **GitHub Actions validates** - Extracts version from tag
5. **Automated changelog extraction** - Pulls from CHANGELOG.md

### Manual Version Update (NOT RECOMMENDED)

If you must update manually:

1. Update `package.json`:
   ```json
   {
     "version": "2.10.0"
   }
   ```

2. Update `CHANGELOG.md`:
   ```markdown
   ## [2.10.0] - 2025-12-24
   ```

3. Update `src/components/app-sidebar.tsx`:
   ```tsx
   Hexa Steel® OTS v2.10.0
   ```

4. Update `src/components/login-form.tsx`:
   ```tsx
   Operations Tracking System v2.10.0
   ```

**⚠️ WARNING:** Manual updates are error-prone. Always use the version-manager script.

## Release Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Development                                              │
│    - Implement features                                     │
│    - Commit changes                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Version Bump                                             │
│    $ node scripts/version-manager.js minor                  │
│    - Updates package.json                                   │
│    - Creates CHANGELOG entry                                │
│    - Updates UI components                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Document Changes                                         │
│    - Edit CHANGELOG.md                                      │
│    - Add release notes                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Commit & Tag                                             │
│    $ git commit -m "chore: release v2.10.0"                 │
│    $ git tag -a v2.10.0 -m "Release v2.10.0"                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Push to GitHub                                           │
│    $ git push origin main --tags                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. GitHub Actions (Automatic)                               │
│    - Build application                                      │
│    - Create release package                                 │
│    - Extract changelog                                      │
│    - Create GitHub Release                                  │
│    - Upload artifacts                                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Deployment                                               │
│    - Download release package                               │
│    - Extract and deploy                                     │
│    - Run migrations                                         │
│    - Restart application                                    │
└─────────────────────────────────────────────────────────────┘
```

## Best Practices

### 1. Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: resolve bug
chore: update dependencies
docs: update documentation
refactor: restructure code
test: add tests
```

### 2. Release Frequency
- **Patch releases**: As needed for critical bugs
- **Minor releases**: Every 1-2 weeks for new features
- **Major releases**: Quarterly or when breaking changes are necessary

### 3. Testing Before Release
- Test all new features
- Verify database migrations
- Check backward compatibility
- Review security implications

### 4. Communication
- Update team before major releases
- Document breaking changes clearly
- Provide migration guides for major versions

### 5. Backup Strategy
- Always backup before deployment
- Keep last 3 versions available
- Test rollback procedures regularly

## Troubleshooting

### Tag Already Exists
```bash
# Delete local tag
git tag -d v2.10.0

# Delete remote tag
git push origin :refs/tags/v2.10.0

# Create new tag
git tag -a v2.10.0 -m "Release v2.10.0"
git push origin v2.10.0
```

### Version Mismatch
```bash
# Check current versions
node scripts/version-manager.js current

# Force update all files
node scripts/version-manager.js patch  # or minor/major
```

### Failed GitHub Action
1. Check workflow logs in GitHub Actions tab
2. Verify secrets are configured (GITHUB_TOKEN)
3. Ensure tag format is correct (v*.*.*)
4. Check build errors in logs

### Deployment Failed
1. Check PM2 logs: `pm2 logs ots-app`
2. Verify environment variables
3. Check database connection
4. Verify migrations ran successfully

## Quick Reference

### Commands
```bash
# Show current version
node scripts/version-manager.js current

# Bump version
node scripts/version-manager.js patch|minor|major

# Create and push tag
git tag -a v2.10.0 -m "Release v2.10.0"
git push origin main --tags

# Deploy
tar -xzf hexa-steel-ots-v2.10.0.tar.gz -C /var/www/app
cd /var/www/app
npm ci --production
npx prisma migrate deploy
pm2 restart ots-app
```

### Files to Update
- `package.json` - Version number
- `CHANGELOG.md` - Release notes
- `src/components/app-sidebar.tsx` - UI version
- `src/components/login-form.tsx` - UI version

### GitHub Workflows
- `.github/workflows/release.yml` - Automated release creation
- `.github/workflows/deploy.yml` - Deployment to Digital Ocean

---

**Remember:** Always use the version-manager script to ensure consistency across all files!
