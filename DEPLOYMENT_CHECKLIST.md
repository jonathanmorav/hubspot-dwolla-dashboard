# Dwolla Proxy Architecture Deployment Checklist

## Pre-Deployment Testing
- [ ] Test extension locally with `npm run dev`
- [ ] Verify HubSpot OAuth flow still works correctly
- [ ] Test Dwolla API calls through proxy
- [ ] Verify session management works
- [ ] Check rate limiting functionality

## Backend Deployment (Railway)

### 1. Environment Variables Required
Add these to your Railway environment:
```env
# Existing variables (keep these)
PORT=3001
API_KEY=your-secure-api-key
HUBSPOT_CLIENT_ID=your-hubspot-client-id
HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret
ALLOWED_EXTENSION_IDS=your-chrome-extension-id

# New Dwolla Client Credentials (add these)
DWOLLA_CLIENT_ID=your-dwolla-client-id
DWOLLA_CLIENT_SECRET=your-dwolla-client-secret
DWOLLA_ENVIRONMENT=sandbox  # or 'production'
```

### 2. Deploy Backend
```bash
# Push to GitHub first
git push origin main

# Railway will auto-deploy from GitHub
# OR manually deploy:
railway up
```

### 3. Verify Backend Deployment
- [ ] Check health endpoint: `https://your-backend.railway.app/health`
- [ ] Verify new endpoints are accessible:
  - POST `/api/session/create`
  - POST `/api/proxy/dwolla/customers/search`
  - GET `/api/proxy/dwolla/customers/:id`
  - GET `/api/proxy/dwolla/customers/:id/transfers`
  - GET `/api/proxy/dwolla/transfers/:id`
  - GET `/api/proxy/dwolla/customers/:id/funding-sources`

## Extension Deployment

### 1. Update Production Environment
Create/update `.env.production`:
```env
VITE_BACKEND_API_URL=https://your-backend.railway.app
VITE_API_KEY=your-secure-api-key
VITE_HUBSPOT_CLIENT_ID=your-hubspot-client-id
VITE_DWOLLA_ENVIRONMENT=production  # or sandbox
```

### 2. Build Production Extension
```bash
npm run build:prod
```

### 3. Test Production Build
- [ ] Load unpacked extension from `dist/` folder
- [ ] Test complete authentication flow
- [ ] Verify all API calls work correctly

### 4. Update Chrome Web Store (if applicable)
- [ ] Create a ZIP of the `dist/` folder
- [ ] Upload to Chrome Web Store Developer Dashboard
- [ ] Update description to mention proxy architecture
- [ ] Submit for review

## Post-Deployment Verification

### 1. Monitor Backend Logs
```bash
railway logs
```

### 2. Check for:
- [ ] Successful session creation
- [ ] Client Credentials token acquisition
- [ ] Proxy request handling
- [ ] No authentication errors

### 3. User Communication
- [ ] Notify team about the update
- [ ] Document that Dwolla no longer requires OAuth
- [ ] Update any user documentation

## Rollback Plan
If issues occur:
1. The old OAuth flow code is still in the backend
2. Revert the extension to previous version
3. Users with existing Dwolla tokens can still use them

## Important Notes
- **Backend MUST be deployed before extension update**
- Existing users will automatically use proxy (no action required)
- HubSpot authentication remains unchanged
- Monitor for first 24 hours after deployment

## Success Criteria
- [ ] All HubSpot functionality works as before
- [ ] Dwolla searches return results via proxy
- [ ] No user authentication required for Dwolla
- [ ] Session management working correctly
- [ ] Rate limiting enforced properly