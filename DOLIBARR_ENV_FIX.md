# Fix Dolibarr Connection Error on Production

## Problem
"Connection Failed - Dolibarr API configuration missing" error even after updating `.env` file.

## Root Cause
Environment variables are loaded when the Node.js application starts. Updating the `.env` file doesn't automatically reload them - you must restart the application.

## Solution

### Step 1: Verify .env file has the correct variables
```bash
cd /var/www/hexasteel.sa/ots
cat .env | grep DOLIBARR
```

You should see:
```
DOLIBARR_API_URL=https://your-dolibarr-url.com/api/index.php
DOLIBARR_API_KEY=your_api_key_here
DOLIBARR_API_TIMEOUT=30000
DOLIBARR_API_RETRIES=3
```

### Step 2: Restart the application with PM2
```bash
pm2 restart ots-app
```

Or if you want to reload (zero-downtime):
```bash
pm2 reload ots-app
```

### Step 3: Verify environment variables are loaded
```bash
pm2 env 0
```

Look for DOLIBARR_API_URL and DOLIBARR_API_KEY in the output.

### Step 4: Check PM2 logs for any errors
```bash
pm2 logs ots-app --lines 50
```

## Required Environment Variables

Add these to your `.env` file:

```env
# Dolibarr ERP Integration
DOLIBARR_API_URL=https://your-dolibarr-instance.com/api/index.php
DOLIBARR_API_KEY=your_dolibarr_api_key_here
DOLIBARR_API_TIMEOUT=30000
DOLIBARR_API_RETRIES=3
```

## How to Get Dolibarr API Key

1. Log into your Dolibarr instance as admin
2. Go to: **Home → Setup → Modules/Applications**
3. Enable the **API/Web Services** module
4. Go to: **Home → Setup → Users & Groups**
5. Select your user or create a dedicated API user
6. Click on **API Keys** tab
7. Generate a new API key
8. Copy the key and add it to your `.env` file

## Testing the Connection

After restarting, test the connection:

1. Log into OTS
2. Navigate to **Dolibarr ERP** page
3. Click **Test Connection** button
4. You should see: "Connected to Dolibarr v22.0.1" (or your version)

## Troubleshooting

### If still not working after restart:

1. **Check if .env file is in the correct location:**
   ```bash
   ls -la /var/www/hexasteel.sa/ots/.env
   ```

2. **Check file permissions:**
   ```bash
   chmod 600 /var/www/hexasteel.sa/ots/.env
   chown www-data:www-data /var/www/hexasteel.sa/ots/.env
   ```

3. **Verify PM2 is using the correct directory:**
   ```bash
   pm2 info ots-app
   ```
   Look for "exec cwd" - should be `/var/www/hexasteel.sa/ots`

4. **Check if Next.js is reading the .env file:**
   ```bash
   pm2 restart ots-app --update-env
   ```

5. **Hard restart PM2:**
   ```bash
   pm2 delete ots-app
   pm2 start ecosystem.config.js
   ```

## Security Notes

- Never commit `.env` file to Git
- Keep API keys secure and rotate them regularly
- Use a dedicated Dolibarr user with minimal required permissions for API access
- Consider using PM2 secrets or environment variables instead of .env file for production
