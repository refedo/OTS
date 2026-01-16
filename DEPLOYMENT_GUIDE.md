# 🚀 Hexa Steel® OTS - Deployment Guide

Complete guide for deploying and upgrading the Hexa Steel® OTS system on Digital Ocean.

## 📋 Table of Contents

1. [Initial Setup](#initial-setup)
2. [Digital Ocean Configuration](#digital-ocean-configuration)
3. [Deployment Process](#deployment-process)
4. [Upgrade Process](#upgrade-process)
5. [Rollback Procedure](#rollback-procedure)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Initial Setup

### Prerequisites

- Node.js 20.x or higher
- MySQL 8.0 or higher
- Git
- PM2 (for process management)
- Digital Ocean account

### 1. Server Setup (Digital Ocean Droplet)

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install MySQL client
apt install -y mysql-client

# Create application directory
mkdir -p /var/www/hexa-steel-ots
mkdir -p /var/backups/hexa-steel-ots
mkdir -p /var/www/hexa-steel-ots/logs

# Create deployment user
adduser deploy
usermod -aG sudo deploy
```

### 2. Clone Repository

```bash
cd /var/www/hexa-steel-ots
git clone https://github.com/your-org/hexa-steel-ots.git .

# Set proper permissions
chown -R deploy:deploy /var/www/hexa-steel-ots
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.production.example .env.production

# Edit with your actual values
nano .env.production
```

**Required Environment Variables:**
```env
DATABASE_URL="mysql://user:pass@db-host:25060/hexa_steel_db"
JWT_SECRET="your-secure-secret-key"
APP_VERSION="1.0.0"
NODE_ENV="production"
```

### 4. Database Setup

```bash
# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Seed initial data (optional)
npx prisma db seed
```

### 5. Build Application

```bash
# Install dependencies
npm ci --production=false

# Build Next.js application
npm run build
```

### 6. Start Application with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

---

## ☁️ Digital Ocean Configuration

### Option 1: Digital Ocean App Platform (Recommended)

**Advantages:**
- Automatic deployments from Git
- Zero-downtime deployments
- Built-in SSL certificates
- Automatic scaling
- Managed database integration

**Setup Steps:**

1. **Create App:**
   - Go to Digital Ocean Dashboard → Apps
   - Click "Create App"
   - Connect your GitHub/GitLab repository

2. **Configure Build:**
   ```yaml
   name: hexa-steel-ots
   services:
     - name: web
       github:
         repo: your-org/hexa-steel-ots
         branch: main
         deploy_on_push: true
       build_command: npm run build
       run_command: npm start
       environment_slug: node-js
       instance_count: 2
       instance_size_slug: professional-xs
   ```

3. **Add Environment Variables:**
   - DATABASE_URL (from managed database)
   - JWT_SECRET
   - APP_VERSION
   - NODE_ENV=production

4. **Connect Database:**
   - Create Digital Ocean Managed MySQL database
   - Add database connection to app

### Option 2: Droplet with Manual Deployment

**Advantages:**
- Full control over server
- Lower cost for small deployments
- Custom configurations

**Setup:**
- Follow Initial Setup steps above
- Use `deploy.sh` script for deployments
- Configure GitHub Actions for CI/CD

---

## 🚀 Deployment Process

### Automated Deployment (GitHub Actions)

1. **Setup GitHub Secrets:**
   - Go to Repository → Settings → Secrets
   - Add the following secrets:
     - `DO_HOST`: Your droplet IP
     - `DO_USER`: SSH user (deploy)
     - `DO_SSH_KEY`: Private SSH key
     - `DATABASE_URL`: Database connection string

2. **Push to Main Branch:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

3. **GitHub Actions will automatically:**
   - Run tests
   - Build application
   - Deploy to server
   - Run migrations
   - Restart application

### Manual Deployment

```bash
# SSH into server
ssh deploy@your-server-ip

# Navigate to app directory
cd /var/www/hexa-steel-ots

# Run deployment script
./deploy.sh deploy
```

**The script will:**
1. ✅ Run pre-deployment checks
2. 💾 Backup database
3. 📥 Pull latest code
4. 📦 Install dependencies
5. 🔄 Run migrations
6. 🔨 Build application
7. ♻️ Reload with zero downtime
8. 🏥 Run health checks

---

## 🔄 Upgrade Process

### Minor Updates (Bug Fixes, Features)

```bash
# Automatic via Git push
git push origin main

# Or manual
./deploy.sh deploy
```

### Major Updates (Breaking Changes)

1. **Schedule Maintenance Window**
   ```bash
   # Notify users via system announcement
   # Put application in maintenance mode (optional)
   ```

2. **Backup Everything**
   ```bash
   ./deploy.sh backup
   
   # Or manual backup
   mysqldump -h host -u user -p database > backup_$(date +%Y%m%d).sql
   ```

3. **Deploy Update**
   ```bash
   ./deploy.sh deploy
   ```

4. **Verify Deployment**
   ```bash
   # Check health endpoint
   curl http://localhost:3000/api/health
   
   # Check PM2 status
   pm2 status
   
   # Check logs
   pm2 logs hexa-steel-ots --lines 50
   ```

### Database Migrations

Prisma handles migrations automatically during deployment:

```bash
# View migration status
npx prisma migrate status

# View migration history
npx prisma migrate history

# Resolve migration issues
npx prisma migrate resolve --rolled-back migration_name
```

---

## ⏮️ Rollback Procedure

### Quick Rollback

```bash
# Rollback to previous version
./deploy.sh rollback
```

### Manual Rollback

```bash
# 1. Identify previous commit
git log --oneline -5

# 2. Reset to previous commit
git reset --hard <commit-hash>

# 3. Rebuild and restart
npm ci
npm run build
pm2 reload hexa-steel-ots
```

### Database Rollback

```bash
# 1. Stop application
pm2 stop hexa-steel-ots

# 2. Restore database from backup
mysql -h host -u user -p database < backup_20250122.sql

# 3. Mark migration as rolled back
npx prisma migrate resolve --rolled-back migration_name

# 4. Restart application
pm2 start hexa-steel-ots
```

---

## 📊 Monitoring

### Health Checks

```bash
# Application health
curl http://localhost:3000/api/health

# Response:
{
  "status": "healthy",
  "version": "1.2.0",
  "database": "connected",
  "uptime": 86400
}
```

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Status
pm2 status

# Logs
pm2 logs hexa-steel-ots

# CPU/Memory usage
pm2 describe hexa-steel-ots
```

### System Version Tracking

Access deployment history:
```bash
# Via API
curl http://localhost:3000/api/system/version

# Or check database
mysql> SELECT * FROM system_versions ORDER BY deployedAt DESC LIMIT 5;
```

### Log Files

```bash
# Application logs
tail -f /var/www/hexa-steel-ots/logs/pm2-out.log
tail -f /var/www/hexa-steel-ots/logs/pm2-error.log

# Deployment logs
tail -f /var/www/hexa-steel-ots/deployment.log
```

---

## 🔧 Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs hexa-steel-ots --err

# Check environment variables
cat .env.production

# Check database connection
npx prisma db pull

# Restart application
pm2 restart hexa-steel-ots
```

### Database Migration Failed

```bash
# Check migration status
npx prisma migrate status

# View failed migration
npx prisma migrate history

# Resolve migration
npx prisma migrate resolve --rolled-back migration_name

# Try again
npx prisma migrate deploy
```

### Build Errors

```bash
# Clear cache
rm -rf .next
rm -rf node_modules
npm cache clean --force

# Reinstall
npm ci
npm run build
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env.production
PORT=3001
```

### Out of Memory

```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Or update ecosystem.config.js
max_memory_restart: '2G'
```

---

## 📝 Best Practices

### Before Deployment

- ✅ Test locally
- ✅ Run database migrations in development first
- ✅ Review code changes
- ✅ Check for breaking changes
- ✅ Backup database

### During Deployment

- ✅ Monitor logs in real-time
- ✅ Check health endpoint
- ✅ Verify critical features
- ✅ Monitor error rates

### After Deployment

- ✅ Verify all features working
- ✅ Check performance metrics
- ✅ Monitor error logs for 24 hours
- ✅ Keep backup for 7 days

---

## 🆘 Emergency Contacts

- **System Admin:** admin@hexasteel.com
- **Database Admin:** dba@hexasteel.com
- **Digital Ocean Support:** https://cloud.digitalocean.com/support

---

## 📚 Additional Resources

- [Prisma Migration Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Digital Ocean App Platform](https://docs.digitalocean.com/products/app-platform/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Last Updated:** January 2025  
**Version:** 1.0.0
