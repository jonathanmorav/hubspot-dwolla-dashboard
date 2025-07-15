# OAuth Debug Instructions

## Quick Debug Steps

### 1. First, get your extension ID:
1. Load the extension in Chrome (chrome://extensions)
2. Copy the Extension ID
3. Open the extension popup and check the console for these values:
   ```javascript
   chrome.runtime.id
   chrome.identity.getRedirectURL()
   ```

### 2. Update your OAuth app configuration:
The redirect URI in your HubSpot/Dwolla OAuth apps MUST be:
```
https://<YOUR-EXTENSION-ID>.chromiumapp.org/
```
Example: `https://abcdefghijklmnop.chromiumapp.org/`

### 3. Check backend configuration:
In your backend `.env` file:
```env
# If you have this line, make sure it includes your extension ID
ALLOWED_EXTENSION_IDS=YOUR-EXTENSION-ID-HERE

# Or comment it out during testing
# ALLOWED_EXTENSION_IDS=
```

### 4. To use the debug auth module:

**Option A: Temporary modification in service-worker.ts**
Change line 201:
```typescript
// FROM:
const { exchangeCodeForToken } = await import('../utils/auth')

// TO:
const { exchangeCodeForTokenDebug: exchangeCodeForToken } = await import('../utils/auth-debug')
```

And line 253:
```typescript
// FROM:
const { exchangeCodeForToken } = await import('../utils/auth')

// TO:
const { exchangeCodeForTokenDebug: exchangeCodeForToken } = await import('../utils/auth-debug')
```

**Option B: Add debug logging to existing auth.ts**
Add these console.log statements to the `exchangeCodeForToken` function in auth.ts:
```typescript
console.log('OAuth Debug:', {
  extensionId: chrome.runtime.id,
  redirectUri: chrome.identity.getRedirectURL(),
  backendUrl: BACKEND_API_URL,
  codeLength: code?.length,
  provider
})
```

### 5. Common issues and fixes:

**Issue: "Extension not allowed"**
- Fix: Update `ALLOWED_EXTENSION_IDS` in backend .env or remove it

**Issue: "Invalid redirect_uri"**
- Fix: Ensure OAuth app redirect URI exactly matches `chrome.identity.getRedirectURL()`

**Issue: "Token exchange failed"**
- Check backend logs for the actual error
- Ensure backend is running and accessible
- Verify client ID and secret are correct

### 6. Test the backend directly:
```bash
# Replace with your actual values
EXTENSION_ID="your-extension-id"
API_KEY="your-api-key"
AUTH_CODE="test-code"

curl -X POST http://localhost:3001/api/oauth/exchange \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Extension-ID: $EXTENSION_ID" \
  -d "{
    \"code\": \"$AUTH_CODE\",
    \"provider\": \"hubspot\",
    \"redirect_uri\": \"https://$EXTENSION_ID.chromiumapp.org/\"
  }"
```

### 7. What to look for in the console:
- Extension ID and redirect URL
- Response status from backend
- Exact error message
- Whether the token was stored successfully

## Most Common Fix

90% of the time, the issue is one of these:
1. Extension ID in `ALLOWED_EXTENSION_IDS` doesn't match actual ID
2. Redirect URI in OAuth app doesn't match extension's redirect URL
3. Backend is not running or not accessible

Start by commenting out `ALLOWED_EXTENSION_IDS` in your backend .env to eliminate that as a variable.