# Production Testing Guide

This guide helps you test your deployed backend and extension to ensure everything works correctly.

## Testing Checklist

### ✅ Backend Deployment Tests

#### 1. Basic Health Check
```bash
# Test your production URL (replace with actual URL)
curl https://your-app-name.railway.app/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-07-14T...",
  "environment": "production",
  "version": "1.0.0"
}
```

#### 2. Service Information
```bash
curl https://your-app-name.railway.app/
```

**Expected Response:**
```json
{
  "service": "OAuth Backend Service",
  "status": "running",
  "environment": "production",
  "endpoints": [
    "POST /api/oauth/exchange",
    "POST /api/oauth/refresh",
    "GET /health"
  ]
}
```

#### 3. API Security Test
```bash
# Test without API key (should fail)
curl -X POST https://your-app-name.railway.app/api/oauth/exchange
```

**Expected Response:**
```json
{
  "error": "Unauthorized"
}
```

### ✅ Extension Production Build Tests

#### 1. Build Production Extension
```bash
# In your extension directory
npm run build:prod
```

**Verify Output:**
- ✅ Shows "Building for PRODUCTION"
- ✅ Shows "Using environment file: .env.production"  
- ✅ Shows correct environment variables in console
- ✅ Build completes without errors

#### 2. Check Service Worker Configuration
```bash
# Check the built service worker contains production URLs
cat dist/service-worker.js | grep "VITE_BACKEND_API_URL"
```

**Expected**: Should show your Railway URL, not localhost

#### 3. Load Extension in Chrome
1. Go to `chrome://extensions`
2. Remove any existing development extension
3. Click "Load unpacked"
4. Select the `dist/` folder
5. Note the Extension ID

### ✅ End-to-End OAuth Tests

#### 1. Extension Authentication Test
1. Click extension icon in Chrome
2. Click "Connect HubSpot"
3. **Should redirect to HubSpot OAuth page**
4. Authorize the application
5. **Should return to extension showing success**

#### 2. Authentication Persistence Test
1. Authenticate with both HubSpot and Dwolla
2. Close the extension popup
3. Reopen the extension popup
4. **Should show both services as authenticated**
5. **Should NOT ask you to authenticate again**

#### 3. Session Management Test
1. Authenticate with both services
2. Leave extension idle for 35+ minutes
3. Try to use extension
4. **Should ask for re-authentication (session expired)**

### ✅ Railway Monitoring

#### 1. Check Deployment Logs
1. Go to Railway dashboard
2. Click your service
3. Go to "Logs" tab
4. **Should see successful startup messages**

#### 2. Monitor Resource Usage
1. Go to "Metrics" tab
2. **CPU usage should be low when idle**
3. **Memory usage should be stable**

#### 3. Test Auto-Deployment
1. Make a small change to backend code (add a console.log)
2. Commit and push to GitHub
3. **Railway should automatically redeploy**
4. **New deployment should show in dashboard**

## Common Issues and Solutions

### 🚨 Backend Issues

#### "Service Unavailable" Error
- **Check**: Railway deployment status
- **Fix**: Redeploy service or check environment variables

#### "Token exchange failed" Error  
- **Check**: Client secrets in Railway environment variables
- **Fix**: Verify secrets match your OAuth app credentials

#### CORS Errors
- **Check**: Extension origin is allowed
- **Fix**: Backend already configured for Chrome extensions

### 🚨 Extension Issues

#### "Failed to connect to backend"
- **Check**: VITE_BACKEND_API_URL in .env.production
- **Fix**: Update with correct Railway URL and rebuild

#### "Authentication not persisting"
- **Check**: Extension uses local storage correctly
- **Fix**: Persistence should work with our implementation

#### OAuth Redirect Errors
- **Check**: Extension ID in HubSpot/Dwolla developer settings
- **Fix**: Update redirect URLs with actual Extension ID

### 🚨 Build Issues

#### Environment variables not updating
- **Check**: Using correct npm script (`npm run build:prod`)
- **Fix**: Delete `dist/` folder and rebuild

#### Service worker errors
- **Check**: Console logs in Chrome DevTools
- **Fix**: Verify service worker syntax is valid

## Performance Testing

### Load Testing (Optional)
```bash
# Test multiple requests (requires 'ab' tool)
ab -n 100 -c 10 https://your-app-name.railway.app/health
```

### OAuth Flow Timing
- Authentication should complete within 5-10 seconds
- Extension popup should open quickly (<1 second)
- API calls should respond within 2-3 seconds

## Security Validation

### ✅ Secrets Check
- ❌ No secrets in extension code (check dist/service-worker.js)
- ✅ Secrets only in Railway environment variables
- ✅ API keys different between dev/production

### ✅ HTTPS Verification
- All backend URLs should use `https://`
- Railway automatically provides SSL certificates
- Mixed content warnings should not appear

### ✅ Extension Permissions
- Extension should only request necessary permissions
- No unnecessary host permissions granted

## Success Criteria

✅ **Backend deployed successfully**
✅ **Health checks pass**
✅ **Extension builds for production**
✅ **OAuth authentication works**
✅ **Authentication persists across popup closes**
✅ **Session timeout works correctly**
✅ **No console errors**
✅ **Railway monitoring shows healthy metrics**

## Next Steps After Testing

1. **Document any custom configurations**
2. **Set up monitoring alerts (optional)**
3. **Plan regular security updates**
4. **Consider custom domain (optional)**
5. **Train team members on usage**

**If all tests pass, your production deployment is ready! 🎉**