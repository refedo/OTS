#!/bin/bash

###############################################################################
# Hexa Steel® OTS - Server Initial Setup Script
# Run this ONCE on your Digital Ocean server
###############################################################################

set -e

echo "╔════════════════════════════════════════════════╗"
echo "║   Hexa Steel® OTS - Server Setup              ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Update system
echo "▶ Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "▶ Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
echo "✓ Node.js version: $(node --version)"
echo "✓ NPM version: $(npm --version)"

# Install PM2
echo "▶ Installing PM2 process manager..."
sudo npm install -g pm2

# Install Nginx
echo "▶ Installing Nginx..."
sudo apt install -y nginx

# Install MySQL
echo "▶ Installing MySQL..."
sudo apt install -y mysql-server

# Secure MySQL installation
echo "▶ Securing MySQL..."
sudo mysql_secure_installation

# Create database and user
echo "▶ Creating database..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS ots_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'ots_user'@'localhost' IDENTIFIED BY 'OTS_SecurePass_2025!';"
sudo mysql -e "GRANT ALL PRIVILEGES ON ots_production.* TO 'ots_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

echo "✓ Database created: ots_production"
echo "✓ Database user: ots_user"
echo "✓ Database password: OTS_SecurePass_2025! (CHANGE THIS!)"

# Create application directory
echo "▶ Creating application directory..."
sudo mkdir -p /var/www/ots
sudo chown -R $USER:$USER /var/www/ots
sudo mkdir -p /var/www/ots/logs

# Configure firewall
echo "▶ Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Install SSL certificate (Let's Encrypt)
echo "▶ Installing Certbot for SSL..."
sudo apt install -y certbot python3-certbot-nginx

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║          Server Setup Completed!               ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Get SSL certificate:"
echo "   sudo certbot --nginx -d hexasteel.sa -d www.hexasteel.sa"
echo ""
echo "2. Configure Nginx for /ots path (see DIGITAL_OCEAN_DEPLOYMENT.md)"
echo ""
echo "3. Create .env file in /var/www/ots/"
echo ""
echo "4. Deploy application using deploy-to-digitalocean.sh"
echo ""
echo "Database credentials (CHANGE THESE!):"
echo "  Database: ots_production"
echo "  User: ots_user"
echo "  Password: OTS_SecurePass_2025!"
echo ""
