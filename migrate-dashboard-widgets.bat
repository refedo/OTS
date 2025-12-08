@echo off
echo ========================================
echo Dashboard Widgets Migration
echo ========================================
echo.
echo This will add the UserDashboardWidget model to the database.
echo.
pause

echo Running Prisma migration...
npx prisma migrate dev --name add_dashboard_widgets

echo.
echo Generating Prisma Client...
npx prisma generate

echo.
echo ========================================
echo Migration Complete!
echo ========================================
echo.
echo The dashboard widgets system is now ready.
echo Please restart your development server.
echo.
pause
