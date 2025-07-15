# Next Steps to Fix OAuth Issue

## What We've Done
1. ✅ Added enhanced logging to service worker to show Extension ID
2. ✅ Added detailed error logging to backend server
3. ✅ Created debugging guides
4. ✅ Rebuilt extension with production settings

## What You Need to Do Now

### 1. Deploy Backend Changes to Railway
```bash
git add .
git commit -m "Add enhanced OAuth debugging logs"
git push
```
Railway will automatically deploy the updated backend with enhanced logging.

### 2. Reload Extension in Chrome
1. Go to `chrome://extensions`
2. Remove the current extension
3. Click "Load unpacked" and select the `dist/` folder
4. **Copy the Extension ID** that Chrome assigns

### 3. Check Service Worker Logs
1. Click "Inspect views: service worker" on your extension
2. Look for these logs when the service worker loads:
   ```
   Service worker loaded successfully
   Extension ID: [your-actual-id]
   Redirect URI: https://[your-actual-id].chromiumapp.org/
   ```

### 4. Test OAuth Flow
1. Click the extension icon
2. Click "Connect HubSpot"
3. Watch the service worker console for:
   ```
   Extension ID: [your-id]
   Redirect URI: https://[your-id].chromiumapp.org/
   Expected Extension ID in Railway: aepmimpminhofdledloibnbchocmnkgo
   IDs Match: true/false  <-- This is critical!
   ```

### 5. Check Railway Logs
1. Go to Railway dashboard
2. View deployment logs
3. Look for the detailed error output that shows:
   - Extension ID match status
   - Actual OAuth provider error
   - Request details

## Most Likely Solutions

### Solution A: Extension ID Mismatch
If the logs show `IDs Match: false`, then:
1. Update `ALLOWED_EXTENSION_IDS` in Railway to your actual extension ID
2. Or temporarily remove `ALLOWED_EXTENSION_IDS` from Railway to disable the check

### Solution B: Redirect URI Not Registered
If Railway logs show `redirect_uri_mismatch`:
1. Copy the exact redirect URI from your extension logs
2. Add it to HubSpot OAuth app settings (including trailing slash!)
3. Add it to Dwolla OAuth app settings (including trailing slash!)

### Solution C: NODE_ENV Issue
If you're seeing generic errors despite enhanced logging:
1. Change `NODE_ENV` in Railway from "development" to "production"
2. This is counterintuitive but your backend checks for "development" to show detailed errors

## Quick Test

Once you've deployed the backend changes, you can quickly test with this command (replace [your-extension-id]):

```bash
curl -X POST https://hubspot-dwolla-dashboard-production.up.railway.app/api/oauth/exchange \
  -H "Content-Type: application/json" \
  -H "X-API-Key: development-key-adzj2id3842" \
  -H "X-Extension-ID: [your-extension-id]" \
  -d '{"code": "test", "provider": "hubspot", "redirect_uri": "https://[your-extension-id].chromiumapp.org/"}'
```

This will show if the backend is accepting your extension ID.

## Summary

The enhanced logging will reveal exactly why the token exchange is failing. The most common issues are:
1. Extension ID doesn't match what's in Railway's `ALLOWED_EXTENSION_IDS`
2. Redirect URI isn't registered in OAuth apps
3. Redirect URI format mismatch (missing trailing slash)

Follow the debugging guide in `OAUTH_DEBUG_GUIDE.md` to interpret the logs and fix the specific issue.