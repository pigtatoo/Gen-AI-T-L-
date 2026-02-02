# Newsletter Automation Setup Guide

This guide explains how to set up automated newsletter sending using GitHub Actions (because Render blocks email sending).

## Overview

Newsletters are automatically sent every **Tuesday at 7:00 AM Singapore Time** to all active subscriptions via GitHub Actions.

## Why GitHub Actions?

Render's free tier blocks outbound email, so we use GitHub Actions to:
1. Fetch subscription data from Supabase
2. Generate newsletter PDFs
3. Send emails via nodemailer (runs in GitHub Actions environment, not Render)

## Setup Instructions

### 1. Configure GitHub Secrets

In your GitHub repository, add the following secrets:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add each of these:

   - **Name:** `SUPABASE_URL`
     - **Value:** Your Supabase URL (from .env)
   
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
     - **Value:** Your Supabase service role key (from .env)
   
   - **Name:** `DEEPSEEK_KEY`
     - **Value:** Your DeepSeek API key (from .env)
   
   - **Name:** `EMAIL_FROM`
     - **Value:** Your email address (e.g., synthora0@gmail.com)
   
   - **Name:** `EMAIL_PASS`
     - **Value:** Your email app password (from .env PASS field)

### 2. Deploy Changes

Commit and push all changes to GitHub:
```bash
git add .
git commit -m "Add automated newsletter sending via GitHub Actions"
git push
```

The workflow will automatically run every Tuesday at 7 AM SGT.

### 3. Manual Testing

You can manually trigger the newsletter sending:

#### Via GitHub Actions UI:
1. Go to **Actions** tab in GitHub
2. Select **Send Weekly Newsletters** workflow
3. Click **Run workflow**
4. Click the green **Run workflow** button

#### Via Local Testing:
```bash
cd server
node scripts/send-all-newsletters.js
```

## How It Works

1. **GitHub Actions** runs on schedule (every Tuesday 7 AM SGT = Monday 11 PM UTC)
2. Checks out the repository and installs dependencies
3. Runs `scripts/send-all-newsletters.js`
4. Script connects to Supabase and fetches all active subscriptions
5. Generates newsletter PDF for each subscription using existing controller
6. Sends emails via nodemailer (works in GitHub Actions, bypasses Render restrictions)
7. Reports success/failure statistics

## Monitoring

- Check the **Actions** tab in GitHub to see workflow runs
- View detailed logs for each newsletter send
- Failed sends are logged with error details
- Workflow exits with error if any newsletters fail

## Schedule Customization

To change the schedule, edit `.github/workflows/send-newsletters.yml`:

```yaml
schedule:
  - cron: '0 23 * * 1'  # Monday 11 PM UTC = Tuesday 7 AM SGT
```

### Cron Schedule Examples (in UTC):
- Every day at 7 AM SGT: `0 23 * * *` (11 PM UTC previous day)
- Every Monday at 9 AM SGT: `0 1 * * 1` (1 AM UTC Monday)
- Every Friday at 5 PM SGT: `0 9 * * 5` (9 AM UTC Friday)

**Remember:** GitHub Actions uses UTC, Singapore is UTC+8, so subtract 8 hours.

Use [crontab.guru](https://crontab.guru/) to help create cron expressions.

## Troubleshooting

### Workflow fails immediately
- Check that all GitHub Secrets are properly set
- Verify secret names match exactly (case-sensitive)

### Email sending fails
- Verify `EMAIL_FROM` and `EMAIL_PASS` are correct
- Check if you need an "App Password" for your email provider (Gmail requires this)
- Ensure 2FA is enabled and app password is generated (for Gmail)

### Newsletter generation fails
- Check `DEEPSEEK_KEY` is valid
- Verify Supabase connection works
- Check if articles exist in database for the topics

### No newsletters received
- Verify subscriptions are marked as `is_active: true` in database
- Check subscription email addresses are valid
- Review workflow logs for specific error messages
- Check spam/junk folders

## Security Notes

- Never commit secrets to the repository
- All sensitive data is stored in GitHub Secrets
- GitHub Actions environment is isolated and secure
- Secrets are not exposed in logs
