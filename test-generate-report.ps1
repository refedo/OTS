# Test Report Generation Script
# This script will test the Hexa Reporting Engine

Write-Host "🔍 Testing Hexa Reporting Engine..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Get a project ID from the database
Write-Host "📊 Fetching a project from database..." -ForegroundColor Yellow

$getProjectQuery = "SELECT id, projectNumber, name FROM Project LIMIT 1;"
$projectJson = npx prisma db execute --stdin --json <<< $getProjectQuery 2>$null

if ($LASTEXITCODE -eq 0 -and $projectJson) {
    $project = $projectJson | ConvertFrom-Json
    
    if ($project.Count -gt 0) {
        $projectId = $project[0].id
        $projectNumber = $project[0].projectNumber
        $projectName = $project[0].name
        
        Write-Host "✅ Found project: $projectNumber - $projectName" -ForegroundColor Green
        Write-Host "   Project ID: $projectId" -ForegroundColor Gray
        Write-Host ""
        
        # Step 2: Generate report
        Write-Host "📄 Generating PDF report..." -ForegroundColor Yellow
        
        $body = @{
            reportType = "project-summary"
            projectId = $projectId
            language = "en"
        } | ConvertTo-Json
        
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:3000/api/reports/generate" `
                -Method POST `
                -ContentType "application/json" `
                -Body $body
            
            if ($response.status -eq "success") {
                Write-Host "✅ Report generated successfully!" -ForegroundColor Green
                Write-Host ""
                Write-Host "📁 Report Details:" -ForegroundColor Cyan
                Write-Host "   URL: $($response.url)" -ForegroundColor White
                Write-Host "   File: $($response.filePath)" -ForegroundColor Gray
                Write-Host "   Project: $($response.metadata.projectNumber)" -ForegroundColor Gray
                Write-Host "   Language: $($response.metadata.language)" -ForegroundColor Gray
                Write-Host "   Generated: $($response.metadata.generatedAt)" -ForegroundColor Gray
                Write-Host ""
                Write-Host "🌐 Open in browser: http://localhost:3000$($response.url)" -ForegroundColor Green
                Write-Host ""
                
                # Ask if user wants to open the PDF
                $open = Read-Host "Open PDF in browser? (Y/N)"
                if ($open -eq "Y" -or $open -eq "y") {
                    Start-Process "http://localhost:3000$($response.url)"
                }
            } else {
                Write-Host "❌ Report generation failed!" -ForegroundColor Red
                Write-Host "   Error: $($response.error)" -ForegroundColor Red
            }
        } catch {
            Write-Host "❌ API request failed!" -ForegroundColor Red
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ No projects found in database" -ForegroundColor Red
        Write-Host "   Please create a project first" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Could not query database" -ForegroundColor Red
    Write-Host "   Make sure your database is running and configured" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Test complete!" -ForegroundColor Cyan
