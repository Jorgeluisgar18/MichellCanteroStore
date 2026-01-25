# Database Backup and Restoration Guide

## Overview

This guide covers manual backup and restoration procedures for the Michell Cantero Store database.

> **Note:** Automatic backups require Supabase Pro plan ($25/month). This guide covers manual backup procedures for free tier.

---

## Backup Methods

### Method 1: Manual Export from Dashboard (Recommended)

1. **Navigate to Supabase Dashboard**
   - Go to https://supabase.com/dashboard/project/blvulymuoantnnwbzigs
   - Click on "Database" → "Backups"

2. **Export Database**
   - Click "Create backup" or "Export"
   - Download the SQL file
   - Store securely (Google Drive, Dropbox, etc.)

3. **Backup Frequency**
   - **Before major changes:** Always
   - **Weekly:** Recommended
   - **Before deployment:** Highly recommended

---

### Method 2: Using Backup Script

#### Prerequisites
```bash
# Install Supabase CLI
npm install -g supabase
```

#### Run Backup
```bash
# Make script executable (Linux/Mac)
chmod +x scripts/backup-db.sh

# Run backup
./scripts/backup-db.sh
```

#### Backup Location
Backups are stored in `./backups/` directory:
```
backups/
  ├── schema_20260124_120000.sql.gz
  ├── schema_20260117_120000.sql.gz
  └── ...
```

---

### Method 3: Direct SQL Export

#### Using psql
```bash
# Get connection string from Supabase dashboard
# Settings → Database → Connection string

pg_dump "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" \
  --schema=public \
  --no-owner \
  --no-acl \
  > backup_$(date +%Y%m%d).sql
```

---

## Restoration Procedures

### Restore from SQL File

#### Option A: Supabase Dashboard
1. Go to SQL Editor in Supabase dashboard
2. Paste the SQL content
3. Execute the SQL

> **Warning:** This will overwrite existing data. Use with caution.

#### Option B: Using psql
```bash
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" \
  < backup_20260124.sql
```

---

## Backup Best Practices

### 1. Regular Schedule
- **Daily:** If possible (manual or automated)
- **Weekly:** Minimum recommended
- **Before changes:** Always backup before migrations

### 2. Multiple Locations
Store backups in at least 2 locations:
- ✅ Local computer
- ✅ Cloud storage (Google Drive, Dropbox)
- ✅ Git repository (schema only, not data)

### 3. Test Restorations
- Test restoration process quarterly
- Verify data integrity after restore
- Document any issues encountered

### 4. Backup Retention
- Keep last 10 backups minimum
- Keep monthly backups for 1 year
- Archive yearly backups indefinitely

---

## Automated Backup (Optional)

### Using GitHub Actions

Create `.github/workflows/backup.yml`:

```yaml
name: Weekly Database Backup

on:
  schedule:
    - cron: '0 2 * * 0' # Every Sunday at 2 AM
  workflow_dispatch: # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Supabase CLI
        run: npm install -g supabase
      
      - name: Create Backup
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        run: |
          # Export schema
          supabase db dump --project-id blvulymuoantnnwbzigs > backup.sql
          
      - name: Upload to Artifact
        uses: actions/upload-artifact@v3
        with:
          name: database-backup-${{ github.run_number }}
          path: backup.sql
          retention-days: 90
```

---

## Emergency Recovery

### In Case of Data Loss

1. **Stop all writes immediately**
   - Pause application if possible
   - Prevent further data corruption

2. **Assess the damage**
   - Identify what data was lost
   - Determine last known good state

3. **Restore from backup**
   - Use most recent backup before incident
   - Follow restoration procedure above

4. **Verify restoration**
   - Check critical tables
   - Verify data integrity
   - Test application functionality

5. **Resume operations**
   - Gradually restore write access
   - Monitor for issues

---

## Upgrade to Automatic Backups

### Supabase Pro Plan Benefits
- **Daily automatic backups** (7-day retention)
- **Point-in-time recovery** (restore to any second)
- **One-click restoration**
- **Peace of mind**

### Cost: $25/month

**When to upgrade:**
- When you have paying customers
- When data loss would be critical
- When manual backups become burdensome

---

## Backup Checklist

### Weekly
- [ ] Run manual backup script
- [ ] Verify backup file created
- [ ] Store backup in cloud storage
- [ ] Clean up old backups (keep last 10)

### Monthly
- [ ] Test restoration process
- [ ] Verify backup integrity
- [ ] Archive monthly backup
- [ ] Review backup strategy

### Before Major Changes
- [ ] Create backup
- [ ] Document current state
- [ ] Test rollback procedure
- [ ] Keep backup accessible during deployment

---

## Support

For backup-related issues:
- Supabase Documentation: https://supabase.com/docs/guides/platform/backups
- Supabase Support: https://supabase.com/dashboard/support

---

**Last Updated:** 2026-01-24  
**Version:** 1.0
