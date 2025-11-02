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
echo ""
echo "📊 Current backups:"
ls -lh "$BACKUP_DIR"

