# OAuth Debugging Guide

This guide helps you identify and fix the OAuth token exchange failure.

## Step 1: Check Extension Logs

1. Open Chrome and go to `chrome://extensions`
2. Find your extension and click "Inspect views: service worker"
3. Look for these console logs:
   ```
   Extension ID: [your-actual-id]
   Redirect URI: https://[your-actual-id].chromiumapp.org/
   Expected Extension ID in Railway: aepmimpminhofdledloibnbchocmnkgo
   IDs Match: true/false
   ```

**If IDs don't match**: Update `ALLOWED_EXTENSION_IDS` in Railway to match your actual extension ID.

## Step 2: Check Railway Backend Logs

1. Go to your Railway dashboard
2. Click on your project
3. Go to the "Deployments" tab
4. Click "View Logs" on the latest deployment
5. Look for these log entries:

### Token Exchange Request Log
```
Token exchange request: {
  provider: 'hubspot',
  hasCode: true,
  codeLength: 32,  // Should be > 0
  redirect_uri: 'https://[extension-id].chromiumapp.org/',
  extensionId: '[your-extension-id]',
  expectedExtensionId: 'aepmimpminhofdledloibnbchocmnkgo',
  extensionIdMatch: true/false  // Must be true
}
```

### OAuth Provider Request Log
```
HubSpot token exchange payload: {
  grant_type: 'authorization_code',
  client_id: '4e69a57d-eb8b-45ef-9088-c822b0eb4d08',
  redirect_uri: 'https://[extension-id].chromiumapp.org/',
  hasClientSecret: true,  // Must be true
  codeLength: 32
}
```

### Error Details Log
```
Token exchange error for hubspot: {
  message: '[actual error message]',
  response: {
    // HubSpot/Dwolla error response
  },
  status: 400/401/etc
}
```

## Step 3: Common Error Messages and Solutions

### 1. "redirect_uri_mismatch"
**Solution**: The redirect URI doesn't match what's registered in your OAuth app.
- Go to HubSpot/Dwolla developer dashboard
- Add exactly: `https://[your-extension-id].chromiumapp.org/` (with trailing slash!)

### 2. "invalid_client"
**Solution**: Client ID or secret is wrong
- Check Railway environment variables match your OAuth app credentials
- Ensure no extra spaces or quotes in the values

### 3. "invalid_grant"
**Solution**: Authorization code is expired or already used
- OAuth codes expire quickly (usually 60 seconds)
- Try the auth flow again to get a fresh code

### 4. Extension ID Mismatch (403 Forbidden)
**Solution**: Your extension ID doesn't match ALLOWED_EXTENSION_IDS
- Either update Railway env var to match your extension ID
- Or remove ALLOWED_EXTENSION_IDS entirely for testing

## Step 4: Quick Fixes

### Fix 1: Update Railway Environment Variables
```bash
# In Railway dashboard, update:
ALLOWED_EXTENSION_IDS=[your-actual-extension-id]
# Or remove it entirely to disable the check
```

### Fix 2: Test Without Extension ID Check
Temporarily remove the extension ID check by clearing `ALLOWED_EXTENSION_IDS` in Railway.

### Fix 3: Verify OAuth App Settings
1. **HubSpot**:
   - Go to: https://app.hubspot.com/developer/[your-account-id]/applications
   - Check "Auth" tab
   - Add redirect URL: `https://[your-extension-id].chromiumapp.org/`

2. **Dwolla**:
   - Go to: https://dashboard.dwolla.com/applications
   - Select your app
   - Add redirect URL: `https://[your-extension-id].chromiumapp.org/`

## Step 5: Deploy Backend Updates

After making the enhanced logging changes:

1. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Add enhanced OAuth debugging logs"
   git push
   ```

2. Railway will auto-deploy the changes

3. Test OAuth flow again and check logs

## Step 6: Manual Token Exchange Test

To isolate backend issues, test token exchange directly:

```bash
# Get a fresh authorization code from the browser console, then:
curl -X POST https://hubspot-dwolla-dashboard-production.up.railway.app/api/oauth/exchange \
  -H "Content-Type: application/json" \
  -H "X-API-Key: development-key-adzj2id3842" \
  -H "X-Extension-ID: [your-extension-id]" \
  -d '{
    "code": "[authorization-code-from-oauth-flow]",
    "provider": "hubspot",
    "redirect_uri": "https://[your-extension-id].chromiumapp.org/"
  }'
```

## Most Common Solution

90% of the time, the issue is one of these:
1. **Extension ID mismatch** - Update ALLOWED_EXTENSION_IDS in Railway
2. **Redirect URI not registered** - Add to OAuth app with exact format including trailing slash
3. **Wrong NODE_ENV** - Should be "production" in Railway for cleaner logs