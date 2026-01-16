@echo off
echo ========================================
echo Dashboard Widgets - Quick Fix
echo ========================================
echo.
echo This will fix the 500 error by:
echo 1. Pushing schema changes to database
echo 2. Regenerating Prisma client
echo.
echo IMPORTANT: Make sure dev server is stopped!
echo Press Ctrl+C now if server is still running.
echo.
pause

echo.
echo Step 1: Pushing schema to database...
call npx prisma db push --accept-data-loss

echo.
echo Step 2: Generating Prisma client...
call npx prisma generate

echo.
echo ========================================
echo Fix Complete!
echo ========================================
echo.
echo Now you can start your dev server:
echo   npm run dev
echo.
echo Then navigate to: http://localhost:3000/dashboard
echo.
pause
