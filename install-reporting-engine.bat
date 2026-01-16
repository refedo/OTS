@echo off
echo ============================================
echo Hexa Reporting Engine (HRE) - Installation
echo ============================================
echo.

echo [1/4] Installing Puppeteer and Handlebars...
call npm install puppeteer handlebars
call npm install --save-dev @types/puppeteer @types/handlebars

echo.
echo [2/4] Creating output directories...
if not exist "public\outputs\reports" mkdir "public\outputs\reports"

echo.
echo [3/4] Creating fonts directory...
if not exist "src\modules\reporting\fonts" mkdir "src\modules\reporting\fonts"

echo.
echo [4/4] Installation complete!
echo.
echo ============================================
echo Next Steps:
echo ============================================
echo 1. Add fonts to: src\modules\reporting\fonts\
echo    - Cairo-Regular.ttf (for Arabic)
echo    - Inter-Regular.ttf (for English)
echo.
echo 2. Start dev server: npm run dev
echo.
echo 3. Test the API:
echo    POST http://localhost:3000/api/reports/generate
echo.
echo 4. Read full documentation:
echo    - HEXA_REPORTING_ENGINE_SETUP.md
echo    - docs\HEXA_REPORTING_ENGINE.md
echo.
echo ============================================
pause
