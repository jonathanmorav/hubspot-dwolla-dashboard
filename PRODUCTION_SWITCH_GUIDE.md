# Switching to Dwolla Production Environment

This guide explains how to switch your extension from Dwolla sandbox to production environment.

## Prerequisites

1. **Dwolla Production Account**: You need an approved Dwolla production application
2. **Production Credentials**: Client ID and Client Secret from Dwolla Dashboard
3. **Railway Deployment**: Backend must be deployed and accessible

## Step-by-Step Instructions

### 1. Update Frontend Configuration

Edit `.env.production`:
```bash
# Change from:
VITE_DWOLLA_ENVIRONMENT=sandbox
VITE_DWOLLA_CLIENT_ID=<sandbox-client-id>

# To:
VITE_DWOLLA_ENVIRONMENT=production
VITE_DWOLLA_CLIENT_ID=<production-client-id>
```

### 2. Update Backend Environment Variables

In Railway dashboard, update these environment variables:
```
DWOLLA_ENVIRONMENT=production
DWOLLA_CLIENT_ID=<your-production-client-id>
DWOLLA_CLIENT_SECRET=<your-production-client-secret>
```

### 3. Rebuild Extension

```bash
# Clean build with production settings
rm -rf dist
NODE_ENV=production npm run build
```

### 4. Backend Considerations

The backend automatically switches URLs based on `DWOLLA_ENVIRONMENT`:
- Sandbox: `https://api-sandbox.dwolla.com`
- Production: `https://api.dwolla.com`

### 5. Testing Checklist

Before going live:
- [ ] Test search functionality with real customer emails
- [ ] Verify Dwolla customer data displays correctly
- [ ] Check transfer history loads properly
- [ ] Confirm rate limiting works as expected
- [ ] Test error handling for API failures

### 6. Important Notes

1. **Data Privacy**: Production contains real customer financial data
2. **Rate Limits**: Production may have different rate limits than sandbox
3. **Compliance**: Ensure PCI compliance requirements are met
4. **Monitoring**: Set up proper logging and monitoring for production
5. **Backups**: Have a rollback plan in case of issues

### 7. Rollback Process

If you need to switch back to sandbox:
1. Revert `.env.production` changes
2. Update Railway environment variables back to sandbox
3. Rebuild and redeploy

## Current Architecture

- **HubSpot**: Direct OAuth authentication from extension
- **Dwolla**: Backend proxy using Client Credentials (no user OAuth needed)
- **Session Management**: 24-hour sessions with extension ID validation
- **Rate Limiting**: 100 requests/hour global limit

## Support

For issues or questions:
- Check logs in Chrome DevTools (popup and service worker consoles)
- Review backend logs in Railway dashboard
- Check for API errors in the Debug Panel (development mode)