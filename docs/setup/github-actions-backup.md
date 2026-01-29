# GitHub Actions Backup Setup Guide

## Overview

Automated weekly database backups using GitHub Actions - completely free!

**Features:**
- ✅ Runs every Sunday at 2 AM UTC
- ✅ Stores backups in GitHub Artifacts (90 days retention)
- ✅ Optional: Upload to Google Drive or AWS S3
- ✅ Automatic cleanup (keeps last 12 backups)
- ✅ Failure notifications via GitHub Issues

---

## Setup Instructions

### Step 1: Add Required Secrets

Go to your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

#### Required Secrets

1. **SUPABASE_ACCESS_TOKEN**
   - Go to https://supabase.com/dashboard/account/tokens
   - Click "Generate new token"
   - Name: "GitHub Actions Backup"
   - Copy the token
   - Add as secret

2. **SUPABASE_PROJECT_ID**
   - Your project ID: `blvulymuoantnnwbzigs`
   - Add as secret

### Step 2: Verify Workflow File

The workflow is already created at:
`.github/workflows/backup.yml`

### Step 3: Test the Workflow

#### Manual Test
1. Go to **Actions** tab in GitHub
2. Select "Weekly Database Backup"
3. Click "Run workflow"
4. Wait for completion (~1-2 minutes)

#### Verify Backup
1. Go to **Actions** tab
2. Click on the completed workflow run
3. Scroll to "Artifacts" section
4. Download `database-backup-YYYY-MM-DD.gz`

---

## Optional: Cloud Storage

### Option A: Google Drive

1. **Create Service Account**
   - Go to Google Cloud Console
   - Create service account
   - Download JSON key

2. **Share Drive Folder**
   - Create folder in Google Drive
   - Share with service account email
   - Note the folder ID

3. **Add Secret**
   - Name: `GDRIVE_CREDENTIALS`
   - Value: Paste entire JSON key

### Option B: AWS S3

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://michell-cantero-backups
   ```

2. **Create IAM User**
   - Permissions: `s3:PutObject` on bucket
   - Generate access keys

3. **Add Secrets**
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (e.g., `us-east-1`)
   - `AWS_S3_BUCKET` (e.g., `michell-cantero-backups`)

---

## Backup Schedule

### Current Schedule
- **Frequency:** Weekly (every Sunday)
- **Time:** 2:00 AM UTC (9:00 PM Colombia time on Saturday)
- **Retention:** 90 days in GitHub, last 12 backups kept

### Modify Schedule

Edit `.github/workflows/backup.yml`:

```yaml
on:
  schedule:
    # Daily at 3 AM UTC
    - cron: '0 3 * * *'
    
    # Every 6 hours
    - cron: '0 */6 * * *'
    
    # Monday-Friday at 2 AM UTC
    - cron: '0 2 * * 1-5'
```

**Cron syntax:** `minute hour day month weekday`

---

## Monitoring

### Check Backup Status

1. **GitHub Actions Tab**
   - See all workflow runs
   - Check success/failure status

2. **Email Notifications**
   - GitHub sends emails on workflow failure
   - Configure in: Settings → Notifications

3. **Failure Issues**
   - Workflow creates GitHub Issue on failure
   - Label: `backup`, `urgent`

### Download Backups

#### From GitHub Artifacts
1. Go to Actions → Workflow run
2. Scroll to Artifacts
3. Click to download

#### From Google Drive
- Check `/backups/michell-cantero-store/` folder

#### From AWS S3
```bash
aws s3 ls s3://michell-cantero-backups/backups/michell-cantero-store/
aws s3 cp s3://michell-cantero-backups/backups/michell-cantero-store/backup_YYYYMMDD_HHMMSS.sql.gz .
```

---

## Restore from Backup

### Step 1: Download Backup
Download `.sql.gz` file from GitHub Artifacts or cloud storage

### Step 2: Decompress
```bash
gunzip backup_20260124_020000.sql.gz
```

### Step 3: Restore to Database

#### Option A: Supabase Dashboard
1. Go to SQL Editor
2. Paste SQL content
3. Execute

#### Option B: Using psql
```bash
psql "postgresql://postgres:[password]@db.blvulymuoantnnwbzigs.supabase.co:5432/postgres" \
  < backup_20260124_020000.sql
```

---

## Troubleshooting

### Workflow Fails

**Check:**
1. Secrets are correctly set
2. Supabase token is valid
3. Project ID is correct

**View Logs:**
- Actions → Failed workflow → View logs

### Backup File Empty

**Possible causes:**
1. No data in database
2. Schema export failed
3. Permissions issue

**Solution:**
- Check Supabase CLI version
- Verify token has correct permissions

### Artifacts Not Appearing

**Check:**
1. Workflow completed successfully
2. Upload step succeeded
3. Artifact retention not expired

---

## Cost

### GitHub Actions
- **Free tier:** 2,000 minutes/month
- **This workflow:** ~2 minutes/week = 8 minutes/month
- **Cost:** $0 ✅

### Storage
- **GitHub Artifacts:** Free (with retention limits)
- **Google Drive:** 15 GB free
- **AWS S3:** ~$0.023/GB/month

---

## Best Practices

1. **Test Restoration**
   - Test restore process monthly
   - Verify data integrity

2. **Monitor Workflow**
   - Check Actions tab weekly
   - Ensure backups are running

3. **Multiple Locations**
   - Use GitHub + cloud storage
   - Geographic redundancy

4. **Retention Policy**
   - Keep 12 weekly backups (3 months)
   - Archive important backups separately

---

## Upgrade Path

When you upgrade to Supabase Pro:
- Keep GitHub Actions for redundancy
- Use Supabase automatic backups as primary
- GitHub backups as secondary/offsite

---

**Last Updated:** 2026-01-24  
**Version:** 1.0
