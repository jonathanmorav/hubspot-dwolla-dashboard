# OAuth Backend Service

This backend service handles secure OAuth token exchange for the Chrome extension, keeping client secrets safe on the server side.

## Security Architecture

```
Chrome Extension → Backend Service → OAuth Providers (HubSpot/Dwolla)
     (public)         (secure)           (authenticated)
```

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

3. **Run the service:**
   ```bash
   npm run dev  # Development with auto-reload
   npm start    # Production
   ```

## Deployment Options

### Option 1: Deploy to Railway
1. Fork this repository
2. Connect Railway to your GitHub
3. Create new project from this repo
4. Set root directory to `/backend`
5. Add environment variables from `.env`
6. Deploy!

### Option 2: Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the backend directory
3. Configure environment variables
4. Use the provided URL in your extension

### Option 3: Deploy to Heroku
1. Create a new Heroku app
2. Set buildpack to Node.js
3. Configure environment variables
4. Deploy via Git push

## Environment Variables

**Required:**
- `API_KEY` - Secure key for extension authentication
- `HUBSPOT_CLIENT_ID` - From HubSpot app
- `HUBSPOT_CLIENT_SECRET` - From HubSpot app (keep secure!)
- `DWOLLA_CLIENT_ID` - From Dwolla app
- `DWOLLA_CLIENT_SECRET` - From Dwolla app (keep secure!)

**Optional:**
- `PORT` - Server port (default: 3001)
- `DWOLLA_ENVIRONMENT` - 'sandbox' or 'production' (default: sandbox)
- `ALLOWED_EXTENSION_IDS` - Comma-separated list of allowed extension IDs

## API Endpoints

### `POST /api/oauth/exchange`
Exchange authorization code for access token.

**Headers:**
- `X-API-Key: your-api-key`
- `X-Extension-ID: chrome-extension-id`

**Body:**
```json
{
  "code": "authorization-code",
  "provider": "hubspot|dwolla",
  "redirect_uri": "https://extension-id.chromiumapp.org/"
}
```

**Response:**
```json
{
  "access_token": "token",
  "expires_in": 3600
}
```

### `POST /api/oauth/refresh`
Refresh an expired access token.

**Headers:**
- `X-API-Key: your-api-key`
- `X-Extension-ID: chrome-extension-id`

**Body:**
```json
{
  "refresh_token": "refresh-token",
  "provider": "hubspot|dwolla"
}
```

### `GET /health`
Health check endpoint.

## Security Best Practices

1. **Never expose client secrets** in the Chrome extension
2. **Use HTTPS** in production
3. **Rotate API keys** regularly
4. **Whitelist extension IDs** in production
5. **Store refresh tokens** securely (consider database)
6. **Implement rate limiting** for production
7. **Add logging and monitoring**

## Production Checklist

- [ ] Use strong, unique API_KEY
- [ ] Set NODE_ENV=production
- [ ] Configure ALLOWED_EXTENSION_IDS
- [ ] Set up HTTPS/SSL
- [ ] Add rate limiting middleware
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure CORS for your domain only
- [ ] Set up database for refresh token storage
- [ ] Add request logging
- [ ] Set up automated backups

## Troubleshooting

**CORS errors:**
- Ensure the extension ID is correct
- Check that CORS middleware is properly configured

**401 Unauthorized:**
- Verify API_KEY matches between extension and backend
- Check X-API-Key header is being sent

**Token exchange fails:**
- Verify client ID and secret are correct
- Check redirect_uri matches exactly
- Ensure proper environment (sandbox vs production)

## Local Development with Extension

1. Start the backend: `npm run dev`
2. Update extension's `.env` with `VITE_BACKEND_API_URL=http://localhost:3001`
3. Rebuild extension: `npm run build`
4. Test OAuth flow in extension