# MongoDB Backup Script voor Appalti (Windows)
# Usage: .\scripts\backup-mongodb.ps1

$ErrorActionPreference = "Stop"

# Config
$BACKUP_DIR = ".\backups\mongodb"
$DATE = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BACKUP_PATH = "$BACKUP_DIR\$DATE"

# MongoDB connection (from env)
$MONGODB_URI = if ($env:MONGODB_URI) { $env:MONGODB_URI } else { "mongodb://localhost:27017" }
$DATABASE_NAME = if ($env:MONGODB_DATABASE) { $env:MONGODB_DATABASE } else { "appalti" }

# Create backup directory
New-Item -ItemType Directory -Force -Path $BACKUP_PATH | Out-Null

Write-Host "🔄 Starting MongoDB backup..." -ForegroundColor Cyan
Write-Host "   Database: $DATABASE_NAME"
Write-Host "   Destination: $BACKUP_PATH"

# Run mongodump
mongodump `
  --uri="$MONGODB_URI" `
  --db="$DATABASE_NAME" `
  --out="$BACKUP_PATH" `
  --gzip

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
    Write-Host "   Location: $BACKUP_PATH"
} else {
    Write-Host "❌ Backup failed!" -ForegroundColor Red
    exit 1
}

# Cleanup old backups (keep last 7 days)
Write-Host ""
Write-Host "🧹 Cleaning up old backups..." -ForegroundColor Yellow

Get-ChildItem -Path $BACKUP_DIR -Directory | 
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | 
  ForEach-Object {
    Write-Host "   Removing: $($_.Name)" -ForegroundColor Gray
    Remove-Item -Path $_.FullName -Recurse -Force
  }

Write-Host "✅ Cleanup complete" -ForegroundColor Green

# Show current backups
Write-Host ""
Write-Host "📊 Current backups:" -ForegroundColor Cyan
Get-ChildItem -Path $BACKUP_DIR -Directory | 
  Select-Object Name, 
    @{Name="Size";Expression={(Get-ChildItem $_.FullName -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB}},
    LastWriteTime |
  Format-Table -AutoSize

