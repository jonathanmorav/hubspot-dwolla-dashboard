# Environment Configuration Guide

This guide explains how to configure the Chrome extension for different environments.

## Environment Files

- `.env.development` - Used for local development (default)
- `.env.production` - Used for production builds
- `.env` - Current environment file (not committed to git)

## Building for Different Environments

### Development Build (Local Backend)
```bash
npm run build
# Uses .env.development with localhost:3001 backend
```

### Production Build (Deployed Backend)
```bash
npm run build:prod
# Uses .env.production with production backend URL
```

## Required Configuration Steps for Production

### 1. Update .env.production
Edit `.env.production` and replace placeholder values:

```bash
# Replace with your actual Railway app URL
VITE_BACKEND_API_URL=https://your-actual-app-name.railway.app

# Replace with a secure random API key
VITE_API_KEY=your-secure-production-key-here
```

### 2. Deploy Backend to Railway
Follow the Railway deployment guide in `RAILWAY_DEPLOYMENT.md`

### 3. Build Extension for Production
```bash
npm run build:prod
```

### 4. Load Production Extension
1. Go to `chrome://extensions`
2. Remove existing development extension
3. Load production extension from `dist/` folder

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_BACKEND_API_URL` | Backend OAuth service URL | `https://app.railway.app` |
| `VITE_API_KEY` | API key for backend authentication | `prod-key-abc123` |
| `VITE_HUBSPOT_CLIENT_ID` | HubSpot OAuth client ID (public) | `4e69a57d-...` |
| `VITE_DWOLLA_CLIENT_ID` | Dwolla OAuth client ID (public) | `aaEBh0JXyC...` |
| `VITE_DWOLLA_ENVIRONMENT` | Dwolla environment | `sandbox` or `production` |

## Security Notes

- ✅ Client IDs are safe to expose (public information)
- ❌ Never put client secrets in these files
- ✅ API keys here are for extension→backend auth only
- ✅ All `.env.*` files are safe to commit to git
- ❌ Real secrets stay in backend environment variables

## Troubleshooting

### Extension shows connection errors
- Check `VITE_BACKEND_API_URL` points to deployed backend
- Verify backend is running and accessible
- Check API key matches between extension and backend

### OAuth authentication fails
- Verify client IDs match in HubSpot/Dwolla developer accounts
- Check redirect URLs are configured correctly
- Ensure backend has correct client secrets

### Build fails with environment errors
- Verify environment file exists (`.env.development` or `.env.production`)
- Check all required variables are set
- Try clearing dist folder: `rm -rf dist && npm run build`