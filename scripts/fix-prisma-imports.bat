@echo off
echo Fixing Prisma imports in API routes...
echo.

REM Use PowerShell to replace the imports
powershell -Command "(Get-ChildItem -Path 'src\app\api' -Filter '*.ts' -Recurse) | ForEach-Object { $content = Get-Content $_.FullName -Raw; if ($content -match 'const prisma = new PrismaClient\(\)') { $newContent = $content -replace 'import { PrismaClient } from ''@prisma/client'';[\r\n]+[\r\n]+const prisma = new PrismaClient\(\);', 'import { prisma } from ''@/lib/prisma'';'; Set-Content -Path $_.FullName -Value $newContent; Write-Host \"Fixed: $($_.FullName)\" } }"

echo.
echo Done! All API routes have been updated to use the Prisma singleton.
pause
