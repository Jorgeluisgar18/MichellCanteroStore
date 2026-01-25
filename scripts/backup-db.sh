#!/bin/bash

# Database Backup Script for Supabase
# This script creates manual backups of your database schema
# Run this weekly or before major changes

set -e

# Configuration
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
PROJECT_ID="${SUPABASE_PROJECT_ID:-blvulymuoantnnwbzigs}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting database backup...${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup filename
SCHEMA_FILE="$BACKUP_DIR/schema_$DATE.sql"

echo -e "${YELLOW}Exporting database schema...${NC}"

# Export schema using Supabase CLI (if available locally)
# For production, you'll need to use pg_dump with connection string
if command -v supabase &> /dev/null; then
    # Local Supabase
    supabase db dump --local > "$SCHEMA_FILE" 2>/dev/null || {
        echo -e "${YELLOW}Local Supabase not running. Use manual export from dashboard.${NC}"
        echo "Visit: https://supabase.com/dashboard/project/$PROJECT_ID/database/backups"
        exit 1
    }
else
    echo -e "${YELLOW}Supabase CLI not installed.${NC}"
    echo "Install with: npm install -g supabase"
    echo "Or export manually from: https://supabase.com/dashboard/project/$PROJECT_ID/database/backups"
    exit 1
fi

# Compress the backup
if [ -f "$SCHEMA_FILE" ]; then
    gzip "$SCHEMA_FILE"
    echo -e "${GREEN}✓ Backup completed: ${SCHEMA_FILE}.gz${NC}"
    
    # Show backup size
    SIZE=$(du -h "${SCHEMA_FILE}.gz" | cut -f1)
    echo -e "${GREEN}  Size: $SIZE${NC}"
    
    # Clean up old backups (keep last 10)
    echo -e "${YELLOW}Cleaning up old backups...${NC}"
    ls -t "$BACKUP_DIR"/schema_*.sql.gz | tail -n +11 | xargs -r rm
    echo -e "${GREEN}✓ Cleanup completed${NC}"
else
    echo -e "${YELLOW}⚠ Backup file not created${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backup process completed successfully${NC}"
echo -e "${YELLOW}Remember to store backups in a secure location!${NC}"
