@echo off
echo ========================================
echo RFI Number Migration Script
echo ========================================
echo.

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

echo Step 3: Running backfill script...
call npx tsx scripts/backfill-rfi-numbers.ts
if %errorlevel% neq 0 (
    echo Error: Failed to backfill RFI numbers
    pause
    exit /b 1
)
echo.

echo ========================================
echo Migration completed successfully!
echo ========================================
pause
