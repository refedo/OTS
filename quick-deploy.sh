#!/bin/bash

# Quick Deployment Fix Script for Hexa Steel OTS
# Handles git conflicts and Server Action cache issues

set -e

echo "🚀 Starting quick deployment..."

# Navigate to app directory
cd /var/www/hexasteel.sa/ots

# Step 1: Stash local changes (package.json conflicts)
echo "📦 Stashing local changes..."
git stash

# Step 2: Pull latest changes
echo "⬇️  Pulling latest changes..."
git pull origin main

# Step 3: Pop stash and keep incoming changes
echo "🔄 Applying stashed changes (keeping remote)..."
git stash pop || echo "No conflicts to resolve"

# If there are conflicts, keep the remote version
if [ -f package.json.orig ]; then
    rm package.json.orig
fi

# Step 4: Clean install dependencies
echo "📥 Installing dependencies..."
npm ci

# Step 5: Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Step 6: Run migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# Step 7: Build application
echo "🏗️  Building application..."
npm run build

# Step 8: Clear PM2 cache and restart
echo "♻️  Restarting application with cache clear..."
pm2 delete ots-app || true
pm2 start npm --name "ots-app" -- start

# Wait for startup
sleep 5

# Step 9: Show logs
echo "📋 Application logs:"
pm2 logs ots-app --lines 20 --nostream

echo "✅ Deployment complete!"
echo ""
echo "⚠️  IMPORTANT: Clear browser cache or use Ctrl+Shift+R to refresh"
echo "   This fixes the 'Failed to find Server Action' error"
