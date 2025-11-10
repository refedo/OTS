@echo off
echo ========================================
echo Running QC Module Database Migration
echo ========================================
echo.

echo Step 1: Running Prisma migration...
npx prisma migrate dev --name add_qc_module

echo.
echo Step 2: Generating Prisma Client...
npx prisma generate

echo.
echo ========================================
echo Migration Complete!
echo ========================================
echo.
echo Please restart your dev server (Ctrl+C and npm run dev)
echo.
pause
