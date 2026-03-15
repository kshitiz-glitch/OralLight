# OralLight Project Packager
# This script creates a deployment-ready package of the OralLight project

Write-Host "🚀 OralLight Project Packager" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Get current directory
$projectPath = Get-Location
$projectName = "oralight-deployment"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outputName = "$projectName-$timestamp.zip"
$outputPath = Join-Path $projectPath $outputName

Write-Host "📁 Project Path: $projectPath" -ForegroundColor Yellow
Write-Host "📦 Output File: $outputName" -ForegroundColor Yellow
Write-Host ""

# Create temporary directory for packaging
$tempDir = Join-Path $env:TEMP "oralight-temp"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "📋 Copying project files..." -ForegroundColor Green

# Copy all files except excluded ones
$excludeDirs = @('node_modules', 'dist', '.git', '.vite')
$excludeFiles = @('*.log', '*.zip', '*.tar')

Get-ChildItem -Path $projectPath -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Substring($projectPath.Path.Length + 1)
    
    # Check if path contains excluded directories
    $shouldExclude = $false
    foreach ($excludeDir in $excludeDirs) {
        if ($relativePath -like "*$excludeDir*") {
            $shouldExclude = $true
            break
        }
    }
    
    # Check if file matches excluded patterns
    foreach ($excludeFile in $excludeFiles) {
        if ($_.Name -like $excludeFile) {
            $shouldExclude = $true
            break
        }
    }
    
    if (-not $shouldExclude) {
        $targetPath = Join-Path $tempDir $relativePath
        
        if ($_.PSIsContainer) {
            if (-not (Test-Path $targetPath)) {
                New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
            }
        } else {
            $targetDir = Split-Path $targetPath -Parent
            if (-not (Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }
            Copy-Item $_.FullName -Destination $targetPath -Force
        }
    }
}

Write-Host "✅ Files copied successfully" -ForegroundColor Green
Write-Host ""

# Create README for deployment
$deploymentReadme = @"
# OralLight - Deployment Package
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Quick Start

1. Extract this zip file to your desired location
2. Open terminal/command prompt in the extracted folder
3. Run: ``npm install``
4. Run: ``npm run dev``
5. Open browser to the displayed URL

## Prerequisites

- Node.js v18 or higher
- npm (comes with Node.js)

## Detailed Instructions

See DEPLOYMENT_GUIDE.md for comprehensive deployment options.

## Support

- Check DEPLOYMENT_CHECKLIST.md for step-by-step guide
- Review user_guide.md for application usage
- See README.md for project information

## Troubleshooting

If ``npm install`` fails:
``````bash
npm cache clean --force
npm install
``````

If port is in use:
``````bash
npm run dev -- --port 3000
``````

---
For more help, see DEPLOYMENT_GUIDE.md
"@

$deploymentReadme | Out-File -FilePath (Join-Path $tempDir "DEPLOYMENT_README.txt") -Encoding UTF8

Write-Host "📝 Creating deployment package..." -ForegroundColor Green

# Create zip file
Compress-Archive -Path "$tempDir\*" -DestinationPath $outputPath -Force

# Clean up temp directory
Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "✅ Package created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Package Location:" -ForegroundColor Cyan
Write-Host "   $outputPath" -ForegroundColor White
Write-Host ""
Write-Host "📊 Package Size:" -ForegroundColor Cyan
$fileSize = (Get-Item $outputPath).Length
$fileSizeMB = [math]::Round($fileSize / 1MB, 2)
Write-Host "   $fileSizeMB MB" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Transfer $outputName to the target system" -ForegroundColor White
Write-Host "   2. Extract the zip file" -ForegroundColor White
Write-Host "   3. Run: npm install" -ForegroundColor White
Write-Host "   4. Run: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "✨ Done! Happy deploying! 🚀" -ForegroundColor Green
