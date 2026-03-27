#!/bin/bash
# Quick fix script for failed enhance_system_events migration
# Run this on production server: bash FIX_PRODUCTION_MIGRATION.sh

set -e

echo "🔧 Fixing failed migration: 20260327000000_enhance_system_events"
echo ""

# Step 1: Mark as rolled back
echo "Step 1: Marking migration as rolled back..."
npx prisma migrate resolve --rolled-back 20260327000000_enhance_system_events

# Step 2: Apply the fix
echo ""
echo "Step 2: Applying MySQL 5.7+ compatible fix..."
echo "Please enter MySQL password when prompted:"
mysql -u root -p ots_db < prisma/migrations/manual/fix_failed_enhance_system_events.sql

# Step 3: Mark as applied
echo ""
echo "Step 3: Marking migration as applied..."
npx prisma migrate resolve --applied 20260327000000_enhance_system_events

# Step 4: Deploy remaining migrations
echo ""
echo "Step 4: Deploying remaining migrations..."
npx prisma migrate deploy

echo ""
echo "✅ Migration fix completed!"
echo ""
echo "Next steps:"
echo "  1. Run: npm run build"
echo "  2. Run: pm2 restart ots"
echo ""
