# Authentication Flow Debug Guide

## 🔍 Step-by-Step Debugging Instructions

### 1. Check Extension Loading
1. Open `chrome://extensions/`
2. Ensure "Developer mode" is ON
3. Find "Unified Customer Dashboard" extension
4. Note the Extension ID (e.g., `aepmimpminhofdledloibnbchocmnkgo`)
5. Click "Service Worker" link to open its DevTools

### 2. Check Service Worker Console
In the Service Worker DevTools:
```javascript
// Check if service worker is active
console.log('Service worker active');

// Check if env config is loaded
import('./src/config/env.js').then(module => {
  console.log('Env config:', module.env);
});

// Test message handling
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('Message received:', msg);
  sendResponse({test: 'ok'});
  return true;
});
```

### 3. Check Popup Console
1. Click the extension icon to open popup
2. Right-click the popup and select "Inspect"
3. In the popup console, check for errors

### 4. Test Authentication Flow Manually
In the popup console:
```javascript
// Test message sending
chrome.runtime.sendMessage({type: 'TEST'}, response => {
  console.log('Response:', response);
  if (chrome.runtime.lastError) {
    console.error('Error:', chrome.runtime.lastError);
  }
});

// Test authentication directly
chrome.runtime.sendMessage({
  type: 'AUTHENTICATE',
  provider: 'hubspot'
}, response => {
  console.log('Auth response:', response);
  if (chrome.runtime.lastError) {
    console.error('Error:', chrome.runtime.lastError);
  }
});
```

### 5. Common Issues and Solutions

#### Issue: "Could not establish connection. Receiving end does not exist."
**Cause**: Service worker is not running or crashed
**Solution**: 
- Reload the extension from `chrome://extensions/`
- Check service worker console for errors
- Ensure `manifest.json` correctly points to service worker

#### Issue: "HubSpot client ID not configured"
**Cause**: Environment variables not loaded in service worker
**Solution**:
- Check if `.env` file exists with correct values
- Rebuild extension: `npm run build`
- Check that `env.ts` is properly importing values

#### Issue: OAuth popup doesn't open
**Cause**: `chrome.identity.launchWebAuthFlow` failing
**Solution**:
- Check Extension ID matches in backend `.env`
- Ensure popup blocker is disabled
- Check permissions in `manifest.json`

#### Issue: Backend connection failed
**Cause**: Backend server not running or CORS issue
**Solution**:
- Run `cd backend && npm start`
- Check `http://localhost:3001/health`
- Verify CORS allows chrome-extension:// origins

### 6. Network Tab Analysis
1. Open Network tab in popup DevTools
2. Click authentication button
3. Look for:
   - Failed requests (red)
   - CORS errors
   - 401/403 status codes

### 7. Check OAuth Configuration
Verify these values match between frontend and backend:
- **Extension ID**: Should be same in Chrome and backend `.env`
- **Client IDs**: Should match in frontend `.env` and backend `.env`
- **Redirect URI**: Check what `chrome.identity.getRedirectURL()` returns

### 8. Test OAuth Redirect URI
In service worker console:
```javascript
console.log('Redirect URI:', chrome.identity.getRedirectURL());
// Should output: https://<extension-id>.chromiumapp.org/
```

### 9. Debug Message Flow
Add these logs to track the flow:

**In App.tsx (handleAuth function):**
```javascript
console.log('1. Starting auth for:', provider);
```

**In useMessageHandler hook:**
```javascript
console.log('2. Sending message:', message);
```

**In service-worker.ts:**
```javascript
console.log('3. Message received in SW:', message);
```

**In auth handlers:**
```javascript
console.log('4. Auth handler called for:', provider);
console.log('5. Client ID:', clientId);
console.log('6. Auth URL:', authUrl);
```

### 10. Manual OAuth Test
If all else fails, test OAuth manually:
1. Get the auth URL from console
2. Open it in a new tab
3. Complete OAuth flow
4. Check if redirect happens to `https://<extension-id>.chromiumapp.org/?code=...`

## 🚨 Critical Checks

1. **Extension ID**: Must match in backend `.env` `ALLOWED_EXTENSION_IDS`
2. **Backend Running**: `http://localhost:3001/health` should return `{"status":"ok"}`
3. **Environment Variables**: Both `.env` files must have correct values
4. **Service Worker Active**: Should show "active" in chrome://extensions/
5. **Permissions**: `manifest.json` must include `identity` permission

## 📝 Debug Checklist

- [ ] Extension loaded successfully
- [ ] Service worker is active (not inactive)
- [ ] Backend server running on port 3001
- [ ] Extension ID matches in backend config
- [ ] No errors in service worker console
- [ ] No errors in popup console
- [ ] Messages being sent from popup
- [ ] Messages being received by service worker
- [ ] OAuth URLs being generated correctly
- [ ] chrome.identity API is accessible
- [ ] Network requests not blocked by CORS