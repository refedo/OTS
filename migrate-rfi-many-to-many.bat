@echo off
echo ========================================
echo RFI Many-to-Many Migration Script
echo ========================================
echo.
echo This will update the RFI schema to support
echo multiple production logs per RFI.
echo.
echo Your 24 existing RFIs will be preserved!
echo.
pause

echo Step 1: Pushing schema changes to database...
call npx prisma db push
if %errorlevel% neq 0 (
    echo Error: Failed to push schema changes
    pause
    exit /b 1
)
echo.

echo Step 2: Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo Error: Failed to generate Prisma Client
    pause
    exit /b 1
)
echo.

echo Step 3: Migrating existing RFIs...
call npx tsx scripts/migrate-rfi-to-many-to-many.ts
if %errorlevel% neq 0 (
    echo Error: Failed to migrate existing RFIs
    pause
    exit /b 1
)
echo.

echo ========================================
echo Migration completed successfully!
echo ========================================
echo.
echo All 24 existing RFIs have been migrated
echo to the new many-to-many structure!
echo.
pause
