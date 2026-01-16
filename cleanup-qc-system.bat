@echo off
echo ========================================
echo QC System Cleanup Script
echo ========================================
echo.
echo This will:
echo 1. Delete broken RFIs (no production logs)
echo 2. Reset orphaned QC statuses
echo.
echo This is safe and will not delete valid data!
echo.
pause

echo Step 1: Deleting broken RFIs...
call npx tsx scripts/delete-broken-rfis.ts
if %errorlevel% neq 0 (
    echo Error: Failed to delete broken RFIs
    pause
    exit /b 1
)
echo.

echo Step 2: Cleaning up orphaned QC statuses...
call npx tsx scripts/cleanup-orphaned-qc-status.ts
if %errorlevel% neq 0 (
    echo Error: Failed to cleanup QC statuses
    pause
    exit /b 1
)
echo.

echo ========================================
echo Cleanup completed successfully!
echo ========================================
echo.
echo Your QC system is now clean:
echo - Broken RFIs removed
echo - Orphaned QC statuses reset
echo - Production logs available for resubmission
echo.
pause
