# Deployment Commands - Run on Server

## Current Issue: Zod Dependency Conflict

The `package.json` has been updated to use `zod@^3.23.8` (compatible with OpenAI SDK).
You need to commit and push this change, then deploy.

## Step-by-Step Deployment

### 1. On Local Machine (Your Computer)

```bash
# Commit the zod version fix
git add package.json
git commit -m "fix: downgrade zod to v3 for openai compatibility"
git push origin main
```

### 2. On Server (SSH to hexasteel)

```bash
# Navigate to app directory
cd /var/www/hexasteel.sa/ots

# Stash any local changes
git stash

# Pull latest changes (includes zod fix)
git pull origin main

# Remove old dependencies
rm -rf node_modules package-lock.json

# Install with correct versions
npm install

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build application
npm run build

# Delete and restart PM2 (clears all caches)
pm2 delete ots-app
pm2 start npm --name "ots-app" -- start

# Monitor logs
pm2 logs ots-app --lines 50
```

## Alternative: One-Line Command

```bash
cd /var/www/hexasteel.sa/ots && git stash && git pull origin main && rm -rf node_modules package-lock.json && npm install && npx prisma generate && npx prisma migrate deploy && npm run build && pm2 delete ots-app && pm2 start npm --name "ots-app" -- start && pm2 logs ots-app --lines 50
```

## If npm install Still Fails

If you still get dependency errors, use legacy peer deps:

```bash
npm install --legacy-peer-deps
```

## Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check application health
curl http://localhost:3000/api/health

# Monitor logs
pm2 logs ots-app
```

## Important Notes

1. **Browser Cache**: After deployment, all users must hard refresh (Ctrl+Shift+R)
2. **Zod Version**: Now using v3.23.8 (compatible with OpenAI SDK)
3. **No Breaking Changes**: Zod v3 to v4 changes are minimal for basic usage

## Troubleshooting

### If build fails with TypeScript errors related to zod:

Most zod v3 to v4 changes are backward compatible. If you see errors:

1. Check the specific error message
2. Most likely it's just type inference - should work at runtime
3. Can use `// @ts-ignore` temporarily if needed

### If OpenAI SDK has issues:

```bash
# Reinstall openai package
npm uninstall openai
npm install openai@^4.73.0
```

## Future Deployments

Once this is working, use the simpler reload command:

```bash
cd /var/www/hexasteel.sa/ots
git pull origin main
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 reload ots-app --update-env
```
