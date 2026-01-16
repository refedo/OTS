#!/bin/bash

###############################################################################
# Hexa Steel® OTS - Digital Ocean Deployment Script
# Deploy to: https://hexasteel.sa/ots
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_USER="root"  # Change to your SSH user
SERVER_HOST="hexasteel.sa"  # Your server hostname or IP
APP_DIR="/var/www/ots"
APP_NAME="ots"

echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Hexa Steel® OTS - Digital Ocean Deployment  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print step
print_step() {
    echo -e "\n${YELLOW}▶ $1${NC}\n"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if SSH key exists
print_step "Checking SSH connection..."
if ssh -o BatchMode=yes -o ConnectTimeout=5 $SERVER_USER@$SERVER_HOST exit 2>/dev/null; then
    print_success "SSH connection successful"
else
    print_error "Cannot connect to server. Please check:"
    echo "  1. Server hostname/IP: $SERVER_HOST"
    echo "  2. SSH user: $SERVER_USER"
    echo "  3. SSH key is configured"
    exit 1
fi

# Build application locally
print_step "Building application locally..."
npm run build
print_success "Build completed"

# Create backup on server
print_step "Creating backup on server..."
ssh $SERVER_USER@$SERVER_HOST "
    if [ -d $APP_DIR ]; then
        BACKUP_DIR=/var/backups/ots/\$(date +%Y%m%d_%H%M%S)
        mkdir -p \$BACKUP_DIR
        cp -r $APP_DIR/.env \$BACKUP_DIR/ 2>/dev/null || true
        echo 'Backup created at \$BACKUP_DIR'
    fi
"
print_success "Backup completed"

# Create app directory if it doesn't exist
print_step "Preparing server directory..."
ssh $SERVER_USER@$SERVER_HOST "
    mkdir -p $APP_DIR
    mkdir -p $APP_DIR/logs
"
print_success "Directory prepared"

# Upload files to server
print_step "Uploading files to server..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude 'logs' \
    ./ $SERVER_USER@$SERVER_HOST:$APP_DIR/
print_success "Files uploaded"

# Install dependencies and setup on server
print_step "Installing dependencies on server..."
ssh $SERVER_USER@$SERVER_HOST "
    cd $APP_DIR
    
    # Install dependencies
    npm install --production
    
    # Generate Prisma client
    npx prisma generate
    
    # Run database migrations
    npx prisma migrate deploy
    
    # Build application
    npm run build
"
print_success "Dependencies installed and application built"

# Restart application with PM2
print_step "Restarting application..."
ssh $SERVER_USER@$SERVER_HOST "
    cd $APP_DIR
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        echo 'Installing PM2...'
        npm install -g pm2
    fi
    
    # Start or reload application
    if pm2 list | grep -q '$APP_NAME'; then
        pm2 reload $APP_NAME --update-env
    else
        pm2 start ecosystem.config.js
        pm2 save
    fi
    
    # Show status
    pm2 status
"
print_success "Application restarted"

# Health check
print_step "Performing health check..."
sleep 5
if curl -f -s -o /dev/null https://hexasteel.sa/ots; then
    print_success "Health check passed"
else
    print_error "Health check failed - please check logs"
    ssh $SERVER_USER@$SERVER_HOST "pm2 logs $APP_NAME --lines 50"
    exit 1
fi

# Display deployment info
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Deployment Completed Successfully!    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "🌐 Application URL: ${GREEN}https://hexasteel.sa/ots${NC}"
echo -e "📊 Monitor logs:    ${YELLOW}ssh $SERVER_USER@$SERVER_HOST 'pm2 logs $APP_NAME'${NC}"
echo -e "🔄 Restart app:     ${YELLOW}ssh $SERVER_USER@$SERVER_HOST 'pm2 restart $APP_NAME'${NC}"
echo ""

# Show recent logs
print_step "Recent application logs:"
ssh $SERVER_USER@$SERVER_HOST "pm2 logs $APP_NAME --lines 20 --nostream"

echo ""
print_success "Deployment completed successfully!"
