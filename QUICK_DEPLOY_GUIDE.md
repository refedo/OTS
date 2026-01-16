# Quick Deployment Guide - hexasteel.sa/ots

Deploy Hexa Steel® OTS to Digital Ocean in 30 minutes!

## 🎯 Goal

Deploy OTS to: **https://hexasteel.sa/ots** (no port number, accessible via /ots path)

## 📋 What You Need

- [ ] Digital Ocean server with hexasteel.sa domain
- [ ] SSH access to server
- [ ] MySQL database
- [ ] SSL certificate (Let's Encrypt)

---

## 🚀 Quick Start (3 Steps)

### Step 1: Setup Server (One-time)

SSH into your server and run:

```bash
# Download and run server setup script
wget https://raw.githubusercontent.com/refedo/OTS/main/server-setup.sh
chmod +x server-setup.sh
./server-setup.sh
```

Or manually:

```bash
# Install Node.js, PM2, Nginx, MySQL
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs nginx mysql-server
sudo npm install -g pm2

# Create database
sudo mysql -e "CREATE DATABASE ots_production;"
sudo mysql -e "CREATE USER 'ots_user'@'localhost' IDENTIFIED BY 'YourSecurePassword';"
sudo mysql -e "GRANT ALL PRIVILEGES ON ots_production.* TO 'ots_user'@'localhost';"
```

### Step 2: Configure Nginx

Edit Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/hexasteel.sa
```

Add this inside your server block:

```nginx
# OTS Application
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
}

# OTS Static Files
location /ots/_next/static/ {
    proxy_pass http://localhost:3000/ots/_next/static/;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3: Deploy Application

From your local machine:

```bash
# Make deployment script executable
chmod +x deploy-to-digitalocean.sh

# Run deployment
./deploy-to-digitalocean.sh
```

Or manually on server:

```bash
# Clone repository
cd /var/www
git clone https://github.com/refedo/OTS.git ots
cd ots

# Create .env file
nano .env
```

Paste this (update values):

```env
NODE_ENV=production
DATABASE_URL="mysql://ots_user:YourPassword@localhost:3306/ots_production"
JWT_SECRET="generate-with-openssl-rand-base64-32"
COOKIE_NAME="ots_session"
NEXT_PUBLIC_APP_URL="https://hexasteel.sa/ots"
NEXT_PUBLIC_BASE_PATH="/ots"
```

Then:

```bash
# Install and build
npm install
npx prisma generate
npx prisma migrate deploy
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the command it gives
```

---

## ✅ Verify Deployment

Visit: **https://hexasteel.sa/ots**

You should see the OTS login page!

Default credentials:
- Email: `admin@hexasteel.com`
- Password: `admin123`

**⚠️ CHANGE THESE IMMEDIATELY!**

---

## 🔧 Common Commands

```bash
# View logs
pm2 logs ots

# Restart application
pm2 restart ots

# Monitor
pm2 monit

# Update application
cd /var/www/ots
git pull
npm install
npm run build
pm2 reload ots
```

---

## 🐛 Troubleshooting

### Can't access /ots
- Check Nginx config: `sudo nginx -t`
- Check app is running: `pm2 status`
- Check logs: `pm2 logs ots`

### Database connection error
- Verify DATABASE_URL in .env
- Test: `mysql -u ots_user -p ots_production`

### 502 Bad Gateway
- App not running: `pm2 start ots`
- Check port 3000: `sudo lsof -i :3000`

### Assets not loading (404)
- Verify `basePath: '/ots'` in next.config.ts
- Check Nginx location blocks
- Clear browser cache

---

## 📊 Architecture

```
Internet
    ↓
HTTPS (443)
    ↓
Nginx (hexasteel.sa)
    ↓
/ots → Proxy to localhost:3000/ots
    ↓
PM2 (Process Manager)
    ↓
Next.js App (Port 3000)
    ↓
MySQL Database (ots_production)
```

---

## 🔒 Security Checklist

After deployment:

- [ ] Change default admin password
- [ ] Update JWT_SECRET with strong random value
- [ ] Enable firewall: `sudo ufw enable`
- [ ] Setup SSL: `sudo certbot --nginx -d hexasteel.sa`
- [ ] Regular backups: `mysqldump ots_production > backup.sql`
- [ ] Update dependencies regularly
- [ ] Monitor logs for errors
- [ ] Setup fail2ban for SSH protection

---

## 📞 Need Help?

1. Check detailed guide: `DIGITAL_OCEAN_DEPLOYMENT.md`
2. View logs: `pm2 logs ots --lines 100`
3. Check Nginx: `sudo tail -f /var/log/nginx/error.log`
4. Test database: `mysql -u ots_user -p`

---

**Deployment Target**: https://hexasteel.sa/ots  
**Repository**: https://github.com/refedo/OTS  
**Documentation**: See DIGITAL_OCEAN_DEPLOYMENT.md for detailed guide
