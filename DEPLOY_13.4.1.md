# Deployment Guide for v13.4.1

## Production Deployment Steps

### 1. Pull Latest Code
```bash
cd /var/www/hexasteel.sa/ots
git pull origin main
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Run Database Migrations
```bash
# Add division column to ScopeSchedule
node scripts/add-division-migration.js

# Update Shop Drawing to Detailing in database
node scripts/update-shop-drawing-to-detailing.js

# Update system version
node scripts/update-version-13.4.1.js
```

### 5. Build Application
```bash
npm run build
```

### 6. Restart PM2
```bash
pm2 restart ots-app
```

### 7. Verify Deployment
```bash
pm2 logs ots-app --lines 50
```

## Quick One-Liner (Run all at once)
```bash
cd /var/www/hexasteel.sa/ots && git pull origin main && npm install && npx prisma generate && node scripts/add-division-migration.js && node scripts/update-shop-drawing-to-detailing.js && node scripts/update-version-13.4.1.js && npm run build && pm2 restart ots-app && pm2 logs ots-app --lines 20
```

## What's New in v13.4.1

### Features Added
- ✅ Division column in planning page (Engineering/Operations/Site)
- ✅ Building filter in planning page
- ✅ Auto-assignment of divisions based on scope type

### Bug Fixes
- ✅ Fixed building edit error (toUpperCase on null)
- ✅ Fixed duplicate building keys in filter
- ✅ What's New dialog now shows only once per version

### Changes
- ✅ Renamed "Shop Drawing" to "Detailing" throughout system
- ✅ Updated all UI labels, API responses, and database records
- ✅ Updated document types and timeline displays

## Rollback (if needed)
```bash
cd /var/www/hexasteel.sa/ots
git reset --hard 2cde251
npm install
npx prisma generate
npm run build
pm2 restart ots-app
```

## Verification Checklist
- [ ] Application starts without errors
- [ ] Planning page shows Division column
- [ ] Building filter works correctly
- [ ] "Detailing" appears instead of "Shop Drawing"
- [ ] Building edit works without errors
- [ ] What's New dialog appears (first login only)
