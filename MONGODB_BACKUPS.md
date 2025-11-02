# MongoDB Backup Strategy - Appalti Platform

## 🎯 Waarom Backups Essentieel Zijn

**Zonder backups risico je**:
- ❌ Data verlies bij database crash
- ❌ Geen recovery bij foute updates
- ❌ Geen historische data bij compliance audit
- ❌ Klanten data onherstelbaar verloren

**Met backups heb je**:
- ✅ Point-in-time recovery (terug naar elk moment)
- ✅ Disaster recovery (bij complete database failure)
- ✅ Compliance (GDPR vereist data protection)
- ✅ Peace of mind 😌

---

## 📦 MongoDB Atlas Cloud Backups (AANBEVOLEN)

Als je MongoDB Atlas gebruikt (wat je waarschijnlijk doet voor productie):

### **1. Enable Continuous Backups**

#### **Stap 1: Open Atlas Dashboard**
```
https://cloud.mongodb.com/
→ Select je cluster
→ Tab "Backup"
```

#### **Stap 2: Enable Cloud Backups**
```
Backup Method: Cloud Backups
Retention Policy: 
  - Snapshots: Daily
  - Retention: 7 days (gratis tier)
            of 30+ days (betaald)
```

#### **Stap 3: Configure Continuous Backups (Recommended)**
```
Continuous Backups:
  ✅ Enable Continuous Cloud Backups
  
Point-in-Time Restore:
  ✅ Enabled (allows restore to any second within retention period)
  
Restore Window:
  • Free Tier (M0): Not available
  • M2/M5: 3 days
  • M10+: Customize (7-30+ days)
```

### **2. Backup Schedule & Retention**

**Recommended Settings voor Productie**:
```yaml
Daily Snapshots:
  Time: 03:00 UTC (4:00 AM Amsterdam)
  Retention: 30 days

Weekly Snapshots:
  Day: Sunday
  Retention: 12 weeks (3 months)

Monthly Snapshots:
  Day: 1st of month
  Retention: 12 months (1 year)

Point-in-Time:
  Window: 30 days
  Granularity: Every second
```

### **3. Test Je Backups!** ⚠️

**Maandelijks testen** (anders weet je niet of restore werkt):

```
1. Atlas Dashboard → Backup → Restore
2. Kies een snapshot (bijv. gisteren)
3. "Restore to new cluster"
4. Verify data:
   - Check aantal documents
   - Check recente clients
   - Check bids en tenders
5. Delete test cluster
```

---

## 🔧 Manual Backups (Alternatief/Aanvullend)

### **Option A: mongodump (Lokale Backup)**

#### **Installeer MongoDB Tools**
```bash
# Windows (via Chocolatey)
choco install mongodb-database-tools

# Mac
brew install mongodb-database-tools

# Linux
sudo apt-get install mongodb-database-tools
```

#### **Maak Backup Script**

**`scripts/backup-mongodb.sh`** (Linux/Mac):
```bash
#!/bin/bash

# MongoDB Backup Script voor Appalti
# Usage: ./scripts/backup-mongodb.sh

set -e

# Config
BACKUP_DIR="./backups/mongodb"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"

# MongoDB connection (from env or .env)
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"
DATABASE_NAME="${MONGODB_DATABASE:-appalti}"

# Create backup directory
mkdir -p "$BACKUP_PATH"

echo "🔄 Starting MongoDB backup..."
echo "   Database: $DATABASE_NAME"
echo "   Destination: $BACKUP_PATH"

# Run mongodump
mongodump \
  --uri="$MONGODB_URI" \
  --db="$DATABASE_NAME" \
  --out="$BACKUP_PATH" \
  --gzip

echo "✅ Backup completed successfully!"
echo "   Location: $BACKUP_PATH"

# Cleanup old backups (keep last 7 days)
find "$BACKUP_DIR" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true

echo "🧹 Cleaned up backups older than 7 days"
```

**`scripts/backup-mongodb.ps1`** (Windows PowerShell):
```powershell
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

Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
Write-Host "   Location: $BACKUP_PATH"

# Cleanup old backups (keep last 7 days)
Get-ChildItem -Path $BACKUP_DIR -Directory | 
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | 
  Remove-Item -Recurse -Force

Write-Host "🧹 Cleaned up backups older than 7 days" -ForegroundColor Yellow
```

#### **Maak Executable en Test**
```bash
# Linux/Mac
chmod +x scripts/backup-mongodb.sh
./scripts/backup-mongodb.sh

# Windows
.\scripts\backup-mongodb.ps1
```

### **Option B: Automated Cloud Backup via Script**

```javascript
// scripts/backup-to-cloud.js
const { exec } = require('child_process');
const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

async function backupToVercelBlob() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `./backups/mongodb-${timestamp}`;
  
  console.log('🔄 Creating MongoDB backup...');
  
  // Run mongodump
  await new Promise((resolve, reject) => {
    exec(`mongodump --uri="${process.env.MONGODB_URI}" --out="${backupPath}" --gzip`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  
  console.log('✅ Backup created');
  console.log('📤 Uploading to Vercel Blob...');
  
  // Compress backup folder to tar.gz
  const tarPath = `${backupPath}.tar.gz`;
  await new Promise((resolve, reject) => {
    exec(`tar -czf "${tarPath}" -C "./backups" "${path.basename(backupPath)}"`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  
  // Upload to Vercel Blob
  const fileBuffer = fs.readFileSync(tarPath);
  const blob = await put(`backups/mongodb-${timestamp}.tar.gz`, fileBuffer, {
    access: 'public',
  });
  
  console.log('✅ Uploaded to:', blob.url);
  
  // Cleanup local files
  fs.rmSync(backupPath, { recursive: true });
  fs.unlinkSync(tarPath);
  
  return blob.url;
}

// Run if called directly
if (require.main === module) {
  backupToVercelBlob()
    .then(url => {
      console.log('🎉 Backup complete!', url);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Backup failed:', error);
      process.exit(1);
    });
}

module.exports = { backupToVercelBlob };
```

---

## ⏰ Automated Backups met Cron/Scheduled Tasks

### **Linux/Mac - Cron**

```bash
# Edit crontab
crontab -e

# Add daily backup at 3 AM
0 3 * * * cd /path/to/appalti && ./scripts/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

### **Windows - Task Scheduler**

```powershell
# Create scheduled task (run as Administrator)
$action = New-ScheduledTaskAction -Execute 'PowerShell.exe' `
  -Argument '-File "C:\Users\remyj\appalti\scripts\backup-mongodb.ps1"'

$trigger = New-ScheduledTaskTrigger -Daily -At 3am

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount

Register-ScheduledTask -Action $action -Trigger $trigger `
  -TaskName "Appalti MongoDB Backup" `
  -Description "Daily MongoDB backup at 3 AM" `
  -Principal $principal
```

### **Vercel Cron Jobs** (voor Cloud Backups)

```typescript
// src/app/api/cron/backup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backupToVercelBlob } from '@/lib/backup';

export async function GET(request: NextRequest) {
  // Verify cron secret (veiligheid)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const backupUrl = await backupToVercelBlob();
    return NextResponse.json({ 
      success: true, 
      backupUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Backup failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Backup failed' 
    }, { status: 500 });
  }
}
```

**`vercel.json`**:
```json
{
  "crons": [{
    "path": "/api/cron/backup",
    "schedule": "0 3 * * *"
  }]
}
```

---

## 🔄 Restore Procedures

### **From Atlas Cloud Backup**

```
1. Atlas Dashboard → Clusters → [Your Cluster]
2. Tab "Backup"
3. Select snapshot or point-in-time
4. Click "Restore"
5. Choose:
   Option A: "Download" (local restore)
   Option B: "Restore to new cluster" (test first!)
   Option C: "Restore to existing cluster" (DANGEROUS - overwrites!)
```

### **From mongodump Backup**

```bash
# Restore complete database
mongorestore \
  --uri="mongodb://localhost:27017" \
  --db="appalti" \
  --gzip \
  ./backups/mongodb/2025-01-01_03-00-00/appalti

# Restore specific collection
mongorestore \
  --uri="mongodb://localhost:27017" \
  --db="appalti" \
  --collection="clientCompanies" \
  --gzip \
  ./backups/mongodb/2025-01-01_03-00-00/appalti/clientCompanies.bson.gz
```

---

## ✅ Backup Checklist voor Productie

- [ ] **Atlas Continuous Backups** enabled
- [ ] **Retention period** configured (min 30 days)
- [ ] **Point-in-time restore** enabled
- [ ] **Backup testing** scheduled (monthly)
- [ ] **Restore procedure** documented en getest
- [ ] **Team trained** on restore process
- [ ] **Monitoring** voor backup failures
- [ ] **Off-site backup** (Atlas = automatisch off-site)

---

## 💰 Kosten

### **MongoDB Atlas Cloud Backups**

```
M0 (Free Tier): ❌ Geen backups
M2/M5: ~€9-25/maand (includes basic backups)
M10+: ~€57+/maand (includes continuous backups)

Extra kosten:
- Continuous backups: Included in M10+
- Extended retention: €0.10/GB/maand
```

### **Self-Hosted Backups**

```
Vercel Blob Storage:
- First 100GB: Gratis
- Additional: €0.15/GB/maand

AWS S3 / Google Cloud Storage:
- ~€0.023/GB/maand (goedkoper dan Vercel)
```

---

## 🎯 Recommended Setup voor Appalti

### **Development**
```
✅ Lokale mongodump backups (wekelijks)
✅ Bewaar in Git LFS of Dropbox
```

### **Staging**
```
✅ Atlas M2/M5 met basic backups
✅ 7 dagen retention
✅ Maandelijkse restore test
```

### **Production**
```
✅ Atlas M10+ met continuous backups
✅ 30 dagen point-in-time restore
✅ Maandelijkse snapshots bewaren 1 jaar
✅ Wekelijkse backup health check
✅ Maandelijkse restore drill (test!)
```

---

## 🆘 Emergency Restore Procedure

**Als je database corrupt is of data verloren:**

### **Step 1: DON'T PANIC** 🧘
- Stop verder werken met de database
- Noteer exact wat er mis is
- Noteer tijdstip van laatste goede state

### **Step 2: Assess Damage**
```bash
# Check what's missing/corrupted
mongo "mongodb://..." --eval "
  db.clientCompanies.countDocuments();
  db.bids.countDocuments();
  db.users.countDocuments();
"
```

### **Step 3: Restore**
```
Option A: Point-in-Time Restore
  → Atlas → Backup → "Restore to [time before incident]"

Option B: Latest Snapshot
  → Atlas → Backup → Select latest good snapshot

Option C: Manual Restore
  → mongorestore from latest backup
```

### **Step 4: Verify**
```
✅ Check document counts
✅ Check recent data (clients, bids)
✅ Check user logins werk
✅ Test critical flows (create client, create bid)
```

### **Step 5: Post-Mortem**
```
📝 Document what went wrong
📝 Update procedures
📝 Prevent recurrence
```

---

## 📞 Support Contact

**MongoDB Atlas Support**: https://support.mongodb.com
**Emergency**: Via Atlas dashboard → Support → "Report Critical Issue"

---

**REMEMBER**: Backups zijn nutteloos als je ze niet test! 🔥

