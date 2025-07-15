# Railway Deployment Guide

This guide walks you through deploying your OAuth backend service to Railway step-by-step.

## Why Railway?

- ✅ **Beginner-friendly**: Deploy directly from GitHub with zero configuration
- ✅ **Free tier**: No credit card required to get started
- ✅ **Automatic HTTPS**: SSL certificates automatically provided
- ✅ **Perfect for Node.js**: Built-in support for Express applications
- ✅ **Environment variables**: Easy configuration through web dashboard

## Prerequisites

- ✅ Code pushed to GitHub repository
- ✅ GitHub account
- ✅ Backend code ready in `/backend` folder

## Step-by-Step Deployment

### Step 1: Sign Up for Railway

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Click **"Sign in with GitHub"**
4. Authorize Railway to access your GitHub account

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: `Hubspot : Dwolla Dashboard`
4. Railway will automatically detect it's a Node.js project

### Step 3: Configure Root Directory

Since your backend is in a subdirectory:

1. Click on your deployed service
2. Go to **"Settings"** tab
3. Scroll to **"Build Configuration"**
4. Set **Root Directory** to: `backend`
5. Click **"Save"**

### Step 4: Configure Environment Variables

1. Go to **"Variables"** tab
2. Add each environment variable by clicking **"New Variable"**:

```bash
# Required Variables
HUBSPOT_CLIENT_ID=4e69a57d-eb8b-45ef-9088-c822b0eb4d08
HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret-here
DWOLLA_CLIENT_ID=aaEBh0JXyCHGdDT8sUvgQn3bWys61zdrXbCPcwU1WkhdMqMVZX
DWOLLA_CLIENT_SECRET=your-dwolla-client-secret-here
DWOLLA_ENVIRONMENT=sandbox
API_KEY=production-secure-key-123
NODE_ENV=production
```

**Important**: Replace the placeholder values:
- Get `HUBSPOT_CLIENT_SECRET` from your HubSpot developer account
- Get `DWOLLA_CLIENT_SECRET` from your Dwolla developer account  
- Generate a random `API_KEY` (e.g., `prod-key-abc123xyz789`)

### Step 5: Deploy

1. Railway automatically deploys when you save environment variables
2. Watch the **"Deployments"** tab for build progress
3. Wait for deployment to show **"SUCCESS"** status

### Step 6: Get Your Production URL

1. Go to **"Settings"** tab
2. Scroll to **"Environment"** section
3. Find **"Public URL"** - this is your production backend URL
4. It will look like: `https://your-app-name.railway.app`

**Save this URL - you'll need it for the extension configuration!**

### Step 7: Test Your Deployment

1. Open your production URL in browser
2. You should see:
```json
{
  "service": "OAuth Backend Service",
  "status": "running",
  "environment": "production",
  "endpoints": [...]
}
```

3. Test health endpoint: `https://your-app-name.railway.app/health`

## Step 8: Update Extension Configuration

1. Edit `.env.production` in your extension project:
```bash
VITE_BACKEND_API_URL=https://your-actual-app-name.railway.app
VITE_API_KEY=production-secure-key-123
```

2. Build production extension:
```bash
npm run build:prod
```

3. Load the production extension in Chrome

## Monitoring Your Deployment

### View Logs
1. Go to Railway dashboard
2. Click your service
3. Go to **"Logs"** tab to see real-time application logs

### Monitor Usage
1. **"Metrics"** tab shows CPU, memory, and network usage
2. **"Deployments"** tab shows deployment history

## Updating Your Deployment

Railway automatically redeploys when you push to GitHub:

1. Make changes to backend code
2. Commit and push to GitHub
3. Railway automatically detects changes and redeploys
4. Monitor the **"Deployments"** tab for progress

## Troubleshooting

### Deployment Fails
- Check **"Logs"** tab for error messages
- Verify all environment variables are set correctly
- Ensure `backend` is set as root directory

### Service Won't Start
- Check if `PORT` is set correctly (Railway provides this automatically)
- Verify Node.js version compatibility
- Check package.json has correct start script

### OAuth Errors
- Verify client IDs and secrets are correct
- Check extension ID is whitelisted (if using `ALLOWED_EXTENSION_IDS`)
- Ensure API keys match between extension and backend

### Environment Variable Issues
- Go to **"Variables"** tab to verify all are set
- Don't use quotes around values in Railway dashboard
- Redeploy after changing variables

## Cost Information

- **Free tier**: 512MB RAM, 1GB storage, 500 hours/month
- **Pricing**: Only pay if you exceed free tier limits
- **No credit card**: Required only when upgrading to paid plan

## Security Best Practices

✅ **Do**: 
- Use strong, random API keys
- Set `NODE_ENV=production`
- Enable `ALLOWED_EXTENSION_IDS` for extra security

❌ **Don't**:
- Share your Railway dashboard access
- Commit secrets to git (they're in Railway only)
- Use development keys in production

## Next Steps

After successful deployment:

1. ✅ Update extension with production URL
2. ✅ Test OAuth flow end-to-end
3. ✅ Monitor logs for any errors
4. ✅ Set up domain name (optional)
5. ✅ Configure alerts (optional)

**Your backend is now live and ready for production use!** 🚀