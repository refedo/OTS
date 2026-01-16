#!/bin/bash

# Production Database Diagnostic Script
# Run this on the production server to check database state

echo "==================================="
echo "Production Database Diagnostic"
echo "==================================="
echo ""

# Check if we're in the right directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: Not in the app directory. Please cd to /var/www/hexasteel.sa/ots"
    exit 1
fi

echo "1. Checking migration status..."
echo "-----------------------------------"
npx prisma migrate status
echo ""

echo "2. Checking if critical tables exist..."
echo "-----------------------------------"
mysql -u root -p ots_db -e "
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS 'Size (MB)'
FROM 
    information_schema.TABLES 
WHERE 
    TABLE_SCHEMA = 'ots_db' 
    AND TABLE_NAME IN (
        'project',
        'user',
        'company_objectives',
        'key_results',
        'annual_initiatives',
        'department_objectives'
    )
ORDER BY 
    TABLE_NAME;
"
echo ""

echo "3. Checking all tables in database..."
echo "-----------------------------------"
mysql -u root -p ots_db -e "SHOW TABLES;"
echo ""

echo "4. Checking _prisma_migrations table..."
echo "-----------------------------------"
mysql -u root -p ots_db -e "
SELECT 
    migration_name,
    finished_at,
    applied_steps_count,
    logs
FROM 
    _prisma_migrations 
ORDER BY 
    finished_at DESC 
LIMIT 10;
"
echo ""

echo "==================================="
echo "Diagnostic Complete"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. If 'project' table is missing, use: npx prisma db push"
echo "2. If migration is stuck, use: npx prisma migrate resolve --rolled-back <migration_name>"
echo "3. See PRODUCTION_MIGRATION_FIX.md for detailed instructions"
