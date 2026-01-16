@echo off
REM Script to update all layout files with NotificationProvider

set LAYOUTS=^
src\app\production\layout.tsx ^
src\app\business-planning\layout.tsx ^
src\app\documents\layout.tsx ^
src\app\itp\layout.tsx ^
src\app\wps\layout.tsx ^
src\app\operations\layout.tsx ^
src\app\settings\layout.tsx ^
src\app\users\layout.tsx ^
src\app\roles\layout.tsx ^
src\app\organization\layout.tsx ^
src\app\buildings\layout.tsx ^
src\app\timeline\layout.tsx ^
src\app\changelog\layout.tsx ^
src\app\ai-assistant\layout.tsx ^
src\app\projects-dashboard\layout.tsx

for %%L in (%LAYOUTS%) do (
  echo Updating %%L
  powershell -Command "(Get-Content '%%L') -replace \"^import { AppSidebar }\", \"'use client';`n`nimport { AppSidebar }\" -replace \"import { AppSidebar } from '@/components/app-sidebar';\", \"import { AppSidebar } from '@/components/app-sidebar';`nimport { NotificationProvider } from '@/contexts/NotificationContext';\" -replace \"  return \(`n    <div\", \"  return (`n    <NotificationProvider>`n      <div\" -replace \"    </div>`n  \);\", \"      </div>`n    </NotificationProvider>`n  );\" | Set-Content '%%L'"
)

echo Done!
