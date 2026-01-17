#!/bin/bash
# Quick deployment script for production fixes

echo "🚀 Deploying fixes to production..."

cd /var/www/hexasteel.sa/ots

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Building application..."
npm run build

echo "🔄 Restarting PM2..."
pm2 restart ots-app

echo "✅ Deployment complete!"
echo "📊 Checking logs..."
pm2 logs ots-app --lines 20
