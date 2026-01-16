#!/bin/bash

# Hexa Steel® OTS Deployment Script
# This script handles safe deployment with automatic rollback on failure

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="hexa-steel-ots"
APP_DIR="/var/www/hexa-steel-ots"
BACKUP_DIR="/var/backups/hexa-steel-ots"
LOG_FILE="$APP_DIR/deployment.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

# Backup database
backup_database() {
    log "Creating database backup..."
    BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p "$BACKUP_DIR"
    
    # Extract database credentials from .env
    DB_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2- | tr -d '"')
    
    # Parse connection string (mysql://user:pass@host:port/database)
    DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        success "Database backup created: $BACKUP_FILE"
        # Keep only last 7 backups
        ls -t $BACKUP_DIR/db_backup_*.sql | tail -n +8 | xargs -r rm
    else
        error "Database backup failed!"
        exit 1
    fi
}

# Check if deployment is safe
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if Git repository is clean
    if [ -n "$(git status --porcelain)" ]; then
        warning "Working directory is not clean. Uncommitted changes detected."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Deployment cancelled."
            exit 1
        fi
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version must be 18 or higher. Current: $(node -v)"
        exit 1
    fi
    
    success "Pre-deployment checks passed"
}

# Main deployment
deploy() {
    log "🚀 Starting deployment of $APP_NAME..."
    
    cd "$APP_DIR"
    
    # Pre-deployment checks
    pre_deployment_checks
    
    # Backup database
    backup_database
    
    # Store current commit for rollback
    CURRENT_COMMIT=$(git rev-parse HEAD)
    log "Current commit: $CURRENT_COMMIT"
    
    # Pull latest changes
    log "Pulling latest changes from Git..."
    git pull origin main
    NEW_COMMIT=$(git rev-parse HEAD)
    log "New commit: $NEW_COMMIT"
    
    if [ "$CURRENT_COMMIT" == "$NEW_COMMIT" ]; then
        warning "No new changes to deploy."
        exit 0
    fi
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --production=false
    
    # Run database migrations
    log "Running database migrations..."
    npx prisma migrate deploy
    
    if [ $? -ne 0 ]; then
        error "Database migration failed! Rolling back..."
        git reset --hard "$CURRENT_COMMIT"
        exit 1
    fi
    
    # Generate Prisma Client
    log "Generating Prisma Client..."
    npx prisma generate
    
    # Build application
    log "Building application..."
    npm run build
    
    if [ $? -ne 0 ]; then
        error "Build failed! Rolling back..."
        git reset --hard "$CURRENT_COMMIT"
        exit 1
    fi
    
    # Reload application with PM2 (zero downtime)
    log "Reloading application..."
    pm2 reload "$APP_NAME" --wait-ready
    
    if [ $? -ne 0 ]; then
        error "Application reload failed! Rolling back..."
        git reset --hard "$CURRENT_COMMIT"
        npm run build
        pm2 reload "$APP_NAME"
        exit 1
    fi
    
    # Health check
    log "Running health check..."
    sleep 5
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
    
    if [ "$HEALTH_CHECK" != "200" ]; then
        error "Health check failed! Status: $HEALTH_CHECK"
        error "Rolling back..."
        git reset --hard "$CURRENT_COMMIT"
        npm run build
        pm2 reload "$APP_NAME"
        exit 1
    fi
    
    success "Deployment completed successfully!"
    log "Application is running on commit: $NEW_COMMIT"
    
    # Show PM2 status
    pm2 status "$APP_NAME"
}

# Rollback function
rollback() {
    log "🔄 Rolling back to previous version..."
    
    cd "$APP_DIR"
    
    # Get previous commit
    PREVIOUS_COMMIT=$(git rev-parse HEAD~1)
    
    if [ -z "$PREVIOUS_COMMIT" ]; then
        error "No previous commit found!"
        exit 1
    fi
    
    log "Rolling back to commit: $PREVIOUS_COMMIT"
    
    git reset --hard "$PREVIOUS_COMMIT"
    npm ci --production=false
    npm run build
    pm2 reload "$APP_NAME" --wait-ready
    
    success "Rollback completed!"
}

# Main script
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    rollback)
        rollback
        ;;
    backup)
        backup_database
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|backup}"
        exit 1
        ;;
esac
