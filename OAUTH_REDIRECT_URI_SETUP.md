# OAuth Redirect URI Configuration Guide

This guide shows exactly how to configure redirect URIs in HubSpot and Dwolla for your Chrome extension.

## Important: Get Your Extension ID First

1. Load your extension in Chrome (`chrome://extensions`)
2. Find your extension and copy the ID (looks like: `aepmimpminhofdledloibnbchocmnkgo`)
3. Your redirect URI will be: `https://[YOUR-EXTENSION-ID].chromiumapp.org/`

**⚠️ CRITICAL: Include the trailing slash!**

## HubSpot Configuration

### Step 1: Access Your App
1. Go to: https://app.hubspot.com/developer/
2. Click on your app (or create one if needed)
3. Navigate to the "Auth" tab

### Step 2: Add Redirect URL
1. In the "Redirect URLs" section, click "Add URL"
2. Enter exactly: `https://[YOUR-EXTENSION-ID].chromiumapp.org/`
   - Example: `https://aepmimpminhofdledloibnbchocmnkgo.chromiumapp.org/`
3. Click "Save"

### Step 3: Verify Settings
- **Client ID**: Should match `4e69a57d-eb8b-45ef-9088-c822b0eb4d08`
- **Scopes**: Should include:
  - `crm.objects.contacts.read`
  - `crm.objects.companies.read`

## Dwolla Configuration

### Step 1: Access Your Application
1. Go to: https://dashboard-sandbox.dwolla.com/ (for sandbox)
   - Or: https://dashboard.dwolla.com/ (for production)
2. Click "Applications" in the left menu
3. Select your application

### Step 2: Add Redirect URL
1. Find the "OAuth redirect URLs" section
2. Click "Add redirect URL"
3. Enter exactly: `https://[YOUR-EXTENSION-ID].chromiumapp.org/`
   - Example: `https://aepmimpminhofdledloibnbchocmnkgo.chromiumapp.org/`
4. Click "Save"

### Step 3: Verify Settings
- **Client ID**: Should match `aaEBh0JXyCHGdDT8sUvgQn3bWys61zdrXbCPcwU1WkhdMqMVZX`
- **Environment**: Sandbox (for testing)
- **Scopes**: Should include:
  - `Customers:read`
  - `Transfers:read`

## Common Mistakes to Avoid

### ❌ DON'T Do This:
- `https://aepmimpminhofdledloibnbchocmnkgo.chromiumapp.org` (missing trailing slash)
- `http://...` (must be HTTPS)
- `chrome-extension://[id]` (wrong format)
- Using localhost URLs

### ✅ DO This:
- `https://aepmimpminhofdledloibnbchocmnkgo.chromiumapp.org/` (correct format)
- Copy the exact output from `chrome.identity.getRedirectURL()`
- Include the trailing slash
- Use lowercase extension ID

## Testing Your Configuration

### 1. Check in Extension Console
```javascript
// Run this in your service worker console:
console.log('My redirect URI:', chrome.identity.getRedirectURL());
// Should output: https://[your-extension-id].chromiumapp.org/
```

### 2. Verify in OAuth Flow
1. Click "Connect HubSpot" in your extension
2. You should see HubSpot's authorization page
3. After authorizing, check for errors in:
   - Extension service worker console
   - Railway backend logs

### 3. Common Error Messages
- **"redirect_uri_mismatch"**: The URI doesn't match exactly
- **"invalid_redirect_uri"**: The URI format is wrong
- **"unauthorized_redirect_uri"**: The URI isn't registered in the app

## Multiple Extension IDs

If you have multiple environments (dev/prod), add all redirect URIs:
- Development: `https://[dev-extension-id].chromiumapp.org/`
- Production: `https://[prod-extension-id].chromiumapp.org/`

## Quick Checklist

- [ ] Extension ID copied correctly
- [ ] Redirect URI includes `https://`
- [ ] Redirect URI includes `.chromiumapp.org/`
- [ ] Trailing slash included
- [ ] Added to HubSpot OAuth app
- [ ] Added to Dwolla OAuth app
- [ ] Matches exactly what `chrome.identity.getRedirectURL()` returns

## Still Having Issues?

1. Check Railway logs for the exact redirect_uri being sent
2. Ensure your extension ID in Railway's `ALLOWED_EXTENSION_IDS` matches
3. Try removing `ALLOWED_EXTENSION_IDS` temporarily for testing