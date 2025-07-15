# OAuth Flow Diagnostic Analysis

## Issue Pattern
1. User clicks "Connect HubSpot"
2. OAuth authorization succeeds (user gets redirected back with code)
3. Token exchange fails with generic error
4. Persistence appears to fail but the real issue is the token exchange

## Key Findings

### 1. Authorization Code Extraction (service-worker.ts)
```typescript
// Lines 193-198
const url = new URL(responseUrl)
const code = url.searchParams.get('code')

if (!code) {
  throw new Error('No authorization code received')
}
```
✅ The code extraction looks correct - it's using URL searchParams properly.

### 2. Extension ID Validation (backend/server.js)
```javascript
// Lines 33-39
if (process.env.ALLOWED_EXTENSION_IDS) {
  const allowedIds = process.env.ALLOWED_EXTENSION_IDS.split(',')
  if (!allowedIds.includes(extensionId)) {
    return res.status(403).json({ error: 'Extension not allowed' })
  }
}
```
⚠️ **Critical**: The backend validates extension IDs if `ALLOWED_EXTENSION_IDS` is set. The extension ID sent is `chrome.runtime.id`.

### 3. Redirect URI Format
The extension uses `chrome.identity.getRedirectURL()` which returns:
- Format: `https://<extension-id>.chromiumapp.org/`
- Example: `https://abcdefghijklmnopqrstuvwxyz.chromiumapp.org/`

### 4. Token Exchange Request (auth.ts)
```typescript
// Lines 27-39
const response = await fetch(`${BACKEND_API_URL}/api/oauth/exchange`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'X-Extension-ID': chrome.runtime.id
  },
  body: JSON.stringify({ 
    code, 
    provider,
    redirect_uri: chrome.identity.getRedirectURL()
  })
})
```

## Potential Issues

### 1. Extension ID Mismatch
**Most Likely Cause**: The extension ID in `ALLOWED_EXTENSION_IDS` doesn't match the actual extension ID.
- Check: Ensure the extension ID from Chrome matches what's in the backend .env file
- The ID changes when you load an unpacked extension vs. published extension

### 2. Redirect URI Mismatch
The redirect URI must match exactly between:
- OAuth app configuration (HubSpot/Dwolla)
- Authorization request
- Token exchange request

### 3. Backend Configuration Issues
Check these environment variables:
- `BACKEND_API_URL` - Is it pointing to the correct backend?
- `API_KEY` - Does it match between extension and backend?
- `HUBSPOT_CLIENT_ID` and `HUBSPOT_CLIENT_SECRET` - Are they correct?
- `ALLOWED_EXTENSION_IDS` - Does it include your extension ID?

### 4. Network/CORS Issues
The backend CORS configuration allows `chrome-extension://` origins, but check:
- Is the backend actually reachable from the extension?
- Are there any network errors in the console?

## Debugging Steps

1. **Get the actual extension ID**:
   ```javascript
   console.log('Extension ID:', chrome.runtime.id);
   console.log('Redirect URL:', chrome.identity.getRedirectURL());
   ```

2. **Check backend logs**:
   - Look for the exact error when token exchange fails
   - Check if the request even reaches the backend

3. **Verify OAuth app configuration**:
   - Ensure redirect URI in HubSpot app matches the extension's redirect URL
   - Format should be: `https://<your-extension-id>.chromiumapp.org/`

4. **Test backend directly**:
   ```bash
   curl -X POST http://localhost:3001/api/oauth/exchange \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your-api-key" \
     -H "X-Extension-ID: your-extension-id" \
     -d '{
       "code": "test-code",
       "provider": "hubspot",
       "redirect_uri": "https://your-extension-id.chromiumapp.org/"
     }'
   ```

5. **Add more detailed logging**:
   - Log the exact error response from the backend
   - Log the full request being sent
   - Log the authorization code to ensure it's not truncated

## Next Steps

1. **Verify Extension ID**: 
   - Load the extension and check chrome://extensions for the ID
   - Update backend .env `ALLOWED_EXTENSION_IDS` if needed

2. **Check OAuth App Config**:
   - Ensure redirect URI in HubSpot/Dwolla matches exactly
   - Should be `https://<extension-id>.chromiumapp.org/`

3. **Test Backend Connection**:
   - Ensure backend is running and accessible
   - Check for any firewall/network issues

4. **Enhanced Error Logging**:
   - Modify auth.ts to log the full error response
   - Add console.log for debugging the exact failure point

The issue is most likely a configuration mismatch rather than a code bug. The OAuth flow implementation looks correct, but the extension ID validation or redirect URI mismatch is preventing successful token exchange.