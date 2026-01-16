# Digital Ocean Deployment Guide - Hexa Steel® OTS

Deploy OTS to: **https://hexasteel.sa/ots**

## 📋 Prerequisites

- Digital Ocean account with access to hexasteel.sa domain
- SSH access to your Digital Ocean server
- Domain hexasteel.sa already configured
- MySQL database (can be on same server or managed database)

## 🏗️ Deployment Architecture

```
hexasteel.sa (Main Website)
    └── /ots (OTS Application - Next.js)
```

**Access URLs:**
- Main site: https://hexasteel.sa
- OTS App: https://hexasteel.sa/ots

## 🚀 Deployment Options

### Option 1: Subdirectory with Nginx Reverse Proxy (Recommended)

This allows OTS to run on port 3000 internally but be accessed via `/ots` path.

### Option 2: Subdomain

Alternative: `ots.hexasteel.sa` (simpler setup)

---

## 📦 Option 1: Deploy to /ots Path (Recommended)

### Step 1: Connect to Your Server

```bash
ssh root@your-server-ip
# or
ssh your-username@hexasteel.sa
```

### Step 2: Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Nginx (if not already installed)
sudo apt install -y nginx

# Install MySQL (if not using managed database)
sudo apt install -y mysql-server
```

### Step 3: Create Application Directory

```bash
# Create directory for OTS
sudo mkdir -p /var/www/ots
sudo chown -R $USER:$USER /var/www/ots
cd /var/www/ots
```

### Step 4: Clone Your Repository

```bash
# Clone from GitHub
git clone https://github.com/refedo/OTS.git .

# Or upload files via SCP/SFTP
# scp -r /path/to/local/mrp/* user@hexasteel.sa:/var/www/ots/
```

### Step 5: Install Dependencies

```bash
cd /var/www/ots
npm install
```

### Step 6: Configure Environment Variables

```bash
# Create production .env file
nano .env
```

Add the following (replace with your actual values):

```env
# Database - Use your Digital Ocean MySQL
DATABASE_URL="mysql://ots_user:your_password@localhost:3306/ots_production"

# Authentication
COOKIE_NAME="ots_session"
JWT_SECRET="generate-a-strong-random-secret-here-use-openssl-rand-base64-32"

# Application URL - IMPORTANT for /ots path
NEXT_PUBLIC_APP_URL="https://hexasteel.sa/ots"
NODE_ENV="production"

# Base Path for subdirectory deployment
NEXT_PUBLIC_BASE_PATH="/ots"
```

### Step 7: Update Next.js Configuration

Create/update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/ots',
  assetPrefix: '/ots',
  trailingSlash: true,
  output: 'standalone',
  
  // Ensure images work with base path
  images: {
    path: '/ots/_next/image',
  },
}

module.exports = nextConfig
```

### Step 8: Setup Database

```bash
# Create database and user
sudo mysql -u root -p

# In MySQL prompt:
CREATE DATABASE ots_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ots_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON ots_production.* TO 'ots_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 9: Run Database Migrations

```bash
cd /var/www/ots

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed initial data
npx prisma db seed
```

### Step 10: Build the Application

```bash
npm run build
```

### Step 11: Configure PM2

Create PM2 ecosystem file:

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'ots',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/ots',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/ots/logs/error.log',
    out_file: '/var/www/ots/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
}
```

### Step 12: Start Application with PM2

```bash
# Create logs directory
mkdir -p /var/www/ots/logs

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it gives you (usually requires sudo)
```

### Step 13: Configure Nginx

Edit your Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/hexasteel.sa
```

Add this location block inside your existing server block:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name hexasteel.sa www.hexasteel.sa;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name hexasteel.sa www.hexasteel.sa;

    # SSL Configuration (your existing SSL settings)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Your existing main website configuration
    location / {
        # Your main website root or proxy
        root /var/www/hexasteel;
        index index.html index.php;
        try_files $uri $uri/ =404;
    }

    # OTS Application - NEW
    location /ots/ {
        proxy_pass http://localhost:3000/ots/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # OTS Static Files
    location /ots/_next/static/ {
        proxy_pass http://localhost:3000/ots/_next/static/;
        proxy_cache_valid 200 60m;
        proxy_cache_bypass $http_upgrade;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # OTS API Routes
    location /ots/api/ {
        proxy_pass http://localhost:3000/ots/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 14: Test and Reload Nginx

```bash
# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

### Step 15: Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

### Step 16: Verify Deployment

Visit: **https://hexasteel.sa/ots**

You should see the OTS login page!

---

## 📦 Option 2: Deploy to Subdomain (Simpler Alternative)

If `/ots` path is too complex, use subdomain instead: `ots.hexasteel.sa`

### DNS Configuration

Add A record:
```
Type: A
Name: ots
Value: your-server-ip
TTL: 3600
```

### Nginx Configuration (Subdomain)

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name ots.hexasteel.sa;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ots.hexasteel.sa;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Environment for Subdomain

```env
NEXT_PUBLIC_APP_URL="https://ots.hexasteel.sa"
# NO basePath needed
```

### Next.js Config for Subdomain

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // No basePath needed for subdomain
  output: 'standalone',
}

module.exports = nextConfig
```

---

## 🔧 Maintenance Commands

```bash
# View application logs
pm2 logs ots

# Restart application
pm2 restart ots

# Stop application
pm2 stop ots

# Monitor application
pm2 monit

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🔄 Update/Deploy New Changes

```bash
cd /var/www/ots

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Run migrations
npx prisma migrate deploy

# Rebuild application
npm run build

# Restart with zero downtime
pm2 reload ots
```

## 🔒 SSL Certificate

If you don't have SSL yet, use Let's Encrypt:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d hexasteel.sa -d www.hexasteel.sa

# Auto-renewal is configured automatically
```

## 🐛 Troubleshooting

### Application won't start
```bash
# Check PM2 logs
pm2 logs ots --lines 100

# Check if port 3000 is in use
sudo lsof -i :3000

# Restart PM2
pm2 restart ots
```

### 502 Bad Gateway
```bash
# Check if app is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify proxy_pass URL in Nginx config
```

### Database connection errors
```bash
# Test database connection
mysql -u ots_user -p ots_production

# Check DATABASE_URL in .env
cat /var/www/ots/.env
```

### Assets not loading (404 on CSS/JS)
- Verify `basePath` in next.config.js
- Check Nginx location blocks for static files
- Clear browser cache

## 📊 Performance Optimization

```bash
# Enable Nginx caching
# Add to nginx.conf http block:
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=ots_cache:10m max_size=1g inactive=60m;

# Enable gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

## 🔐 Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT_SECRET
- [ ] Enable firewall (ufw)
- [ ] Setup SSL certificate
- [ ] Regular backups of database
- [ ] Keep Node.js and dependencies updated
- [ ] Monitor application logs
- [ ] Setup fail2ban for SSH protection

## 📞 Support

For issues:
1. Check PM2 logs: `pm2 logs ots`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify environment variables
4. Test database connection

---

**Deployment URL**: https://hexasteel.sa/ots  
**Alternative**: https://ots.hexasteel.sa  
**Application**: Hexa Steel® Operations Tracking System
