# Next Steps: Launching the HubSpot & Dwolla Dashboard Extension

This document outlines the complete process for launching your Chrome extension from development to production.

## 📋 Launch Checklist Overview

- [ ] Phase 1: OAuth Setup & API Configuration
- [ ] Phase 2: Backend Service Deployment
- [ ] Phase 3: Extension Configuration
- [ ] Phase 4: Testing & Validation
- [ ] Phase 5: Chrome Web Store Submission (Optional)
- [ ] Phase 6: Internal Distribution

---

## Phase 1: OAuth Setup & API Configuration

### 1.1 Create Developer Accounts

**HubSpot Developer Account:**
- Sign up at https://developers.hubspot.com/
- Verify your email
- Complete developer profile

**Dwolla Developer Account:**
- Sign up at https://dashboard.dwolla.com/
- Choose Sandbox environment initially
- Complete business verification (for production)

### 1.2 Get Your Extension ID

1. Build the extension:
   ```bash
   npm run build
   ```

2. Load in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `dist` folder from your project
   - **Copy the Extension ID** (format: `abcdefghijklmnopqrstuvwxyz123456`)

> ⚠️ **Important**: Save this Extension ID - you'll need it for OAuth configuration!

### 1.3 Configure OAuth Applications

#### HubSpot App Configuration

1. Go to HubSpot developer dashboard
2. Click "Create app"
3. Fill in app details:
   - App name: "HubSpot Dwolla Dashboard"
   - Description: "Chrome extension for unified customer data"
4. Navigate to "Auth" tab
5. Add redirect URL:
   ```
   https://YOUR_EXTENSION_ID.chromiumapp.org/
   ```
6. Select required scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.companies.read`
7. Save and copy:
   - Client ID
   - Client Secret (keep secure!)

#### Dwolla App Configuration

1. Go to Dwolla dashboard
2. Navigate to "Applications"
3. Click "Create application"
4. Fill in details:
   - Application name: "Customer Dashboard Extension"
   - OAuth redirect URL:
     ```
     https://YOUR_EXTENSION_ID.chromiumapp.org/
     ```
5. Select OAuth scopes:
   - `Customers:read`
   - `Transfers:read`
6. Save and copy:
   - Client ID (Key)
   - Client Secret (keep secure!)

---

## Phase 2: Backend Service Deployment

The backend service handles OAuth token exchange securely. Choose ONE deployment option:

### Option A: Railway (Recommended - Easiest)

1. **Prepare GitHub:**
   - Ensure your code is pushed to GitHub
   - Backend code is in `/backend` folder

2. **Deploy to Railway:**
   - Go to https://railway.app/
   - Sign up/login with GitHub
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Set root directory to `/backend`

3. **Configure Environment Variables:**
   ```
   API_KEY=generate-a-secure-random-string-here
   HUBSPOT_CLIENT_ID=your-hubspot-client-id
   HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret
   DWOLLA_CLIENT_ID=your-dwolla-client-id
   DWOLLA_CLIENT_SECRET=your-dwolla-client-secret
   DWOLLA_ENVIRONMENT=sandbox
   ALLOWED_EXTENSION_IDS=your-extension-id
   PORT=3001
   ```

4. **Deploy:**
   - Click "Deploy"
   - Copy your deployment URL (e.g., `https://your-app.railway.app`)

### Option B: Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd backend
   vercel
   ```

3. **Configure environment variables in Vercel dashboard**

4. **Note your URL:** `https://your-app.vercel.app`

### Option C: Heroku

1. **Create Heroku app:**
   ```bash
   heroku create your-app-name
   ```

2. **Deploy backend:**
   ```bash
   cd backend
   git init
   heroku git:remote -a your-app-name
   git add .
   git commit -m "Backend service"
   git push heroku main
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set API_KEY=your-secure-key
   # ... set all other variables
   ```

### 🔒 Security Note for API_KEY

Generate a secure API_KEY using:
```bash
openssl rand -base64 32
```
Or use an online generator: https://randomkeygen.com/

---

## Phase 3: Extension Configuration

### 3.1 Create Environment File

Create `.env` file in project root:

```env
# Backend Configuration
VITE_BACKEND_API_URL=https://your-backend-url.railway.app
VITE_API_KEY=your-secure-api-key-from-backend

# Optional: Development overrides
# VITE_BACKEND_API_URL=http://localhost:3001
```

### 3.2 Rebuild Extension

```bash
# Install dependencies if needed
npm install

# Build the extension
npm run build
```

### 3.3 Reload Extension

1. Go to `chrome://extensions/`
2. Find your extension
3. Click the refresh icon
4. Verify version updated

---

## Phase 4: Testing & Validation

### 4.1 Authentication Testing

- [ ] Click extension icon
- [ ] Click "Connect HubSpot"
- [ ] Complete OAuth flow
- [ ] Verify "✓ HubSpot Connected" appears
- [ ] Click "Connect Dwolla"  
- [ ] Complete OAuth flow
- [ ] Verify "✓ Dwolla Connected" appears

### 4.2 Search Functionality Testing

Test with different search types:
- [ ] Email search: `john@example.com`
- [ ] Name search: `John Doe`
- [ ] Business search: `Acme Corp`

For each search:
- [ ] Results appear in < 3 seconds
- [ ] HubSpot panel shows contacts/companies
- [ ] Dwolla panel shows customers
- [ ] Click Dwolla customer to load transfers

### 4.3 Performance Validation

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Perform searches
4. Verify:
   - [ ] API calls complete in < 3s
   - [ ] No console errors
   - [ ] No failed requests

### 4.4 Error Handling Testing

- [ ] Search with no results
- [ ] Disconnect and reconnect services
- [ ] Test with invalid search queries
- [ ] Verify error messages are user-friendly

---

## Phase 5: Chrome Web Store Submission (Optional)

### 5.1 Prepare Store Assets

**Required Images:**
- [ ] Store icon: 128x128px (already have: `icon-128.png`)
- [ ] Screenshots: 1280x800px or 640x400px (minimum 1, maximum 5)
- [ ] Promotional images (optional):
  - Small tile: 440x280px
  - Large tile: 920x680px
  - Marquee: 1400x560px

**Create Screenshots:**
1. Open extension in Chrome
2. Use Chrome DevTools device toolbar for consistent size
3. Capture:
   - Authentication screen
   - Search interface
   - Results with data
   - Both panels populated

### 5.2 Create Store Listing Content

**Short Description (132 characters max):**
```
Unified dashboard for HubSpot & Dwolla customer data. Search and view customer information from both platforms in one place.
```

**Detailed Description:**
```
Streamline your customer support workflow with the Unified Customer Dashboard Chrome Extension.

This extension provides support teams with instant access to customer data from both HubSpot and Dwolla, eliminating the need to switch between multiple tabs and applications.

Features:
★ Quick customer search by email, name, or business name
★ Secure OAuth authentication
★ Split-panel view showing data from both platforms
★ Real-time data fetching with fast performance
★ View customer contacts, companies, and payment transfers
★ Zero data storage for enhanced security
★ Automatic session timeout for security

Perfect for:
• Customer support teams
• Account managers
• Financial operations teams
• Anyone who needs quick access to customer data

The extension prioritizes security and privacy:
• No customer data is stored locally
• Secure OAuth 2.0 authentication
• Encrypted communication
• Automatic session expiration

Save time and improve customer service by having all the information you need in one convenient location.
```

### 5.3 Create Privacy Policy

Create `PRIVACY_POLICY.md` with:
- Data collection practices (none)
- API usage explanation
- User permissions required
- Contact information

### 5.4 Submit to Chrome Web Store

1. **Create Developer Account:**
   - Go to https://chrome.google.com/webstore/devconsole
   - Pay one-time $5 registration fee
   - Verify account

2. **Package Extension:**
   ```bash
   npm run build
   cd dist
   zip -r ../extension.zip .
   ```

3. **Upload to Store:**
   - Click "New Item"
   - Upload `extension.zip`
   - Fill in all listing details
   - Add screenshots
   - Select categories
   - Set visibility (Public/Unlisted)

4. **Submit for Review:**
   - Review all information
   - Accept terms
   - Submit
   - Wait 1-3 business days for review

---

## Phase 6: Internal Distribution (Alternative)

If not publishing publicly, use these methods:

### 6.1 Developer Mode Distribution

**For Small Teams (<10 users):**

1. Share the built `dist` folder
2. Each user:
   - Enables Developer mode in Chrome
   - Loads unpacked extension
   - Uses the same Extension ID

### 6.2 CRX File Distribution

**For Larger Teams:**

1. Package as CRX:
   ```bash
   # In Chrome extensions page
   # Click "Pack extension"
   # Select dist folder
   # Creates .crx file
   ```

2. Distribute .crx file internally
3. Users drag-drop into Chrome

### 6.3 Google Workspace Distribution

**For Organizations:**
- Use Google Admin console
- Deploy to organizational units
- Manage centrally

---

## 🔒 Security Checklist

Before going to production:

- [ ] Generate strong API_KEY (32+ characters)
- [ ] Set `DWOLLA_ENVIRONMENT=production` when ready
- [ ] Verify HTTPS on backend service
- [ ] Set `ALLOWED_EXTENSION_IDS` in backend
- [ ] Remove any console.log statements with sensitive data
- [ ] Ensure `.env` files are in `.gitignore`
- [ ] Set up backend monitoring/alerts
- [ ] Document incident response plan
- [ ] Schedule regular security reviews

---

## 📈 Post-Launch Tasks

### Monitoring
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Monitor API usage/limits
- [ ] Track performance metrics
- [ ] Set up uptime monitoring for backend

### Maintenance
- [ ] Plan for regular dependency updates
- [ ] Monitor Chrome extension API changes
- [ ] Keep OAuth tokens fresh
- [ ] Regular security audits

### Documentation
- [ ] Create user guide
- [ ] Document common issues
- [ ] Create video tutorials
- [ ] Set up support channel

---

## 🚀 Quick Start Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build extension
npm run typecheck    # Check types
npm run lint         # Run linter

# Backend (from /backend folder)
npm run dev          # Start with hot reload
npm start            # Production mode

# Git
git add .
git commit -m "message"
git push origin main
```

---

## 📞 Support & Troubleshooting

### Common Issues

**Extension won't load:**
- Check manifest.json is valid
- Ensure all files built correctly
- Look for console errors

**OAuth fails:**
- Verify redirect URL matches exactly
- Check client ID/secret are correct
- Ensure scopes are authorized

**No search results:**
- Confirm both services authenticated
- Check network tab for API errors
- Verify backend is running

### Getting Help

1. Check console logs (F12)
2. Review backend logs
3. Verify environment variables
4. Test with sandbox/development first

---

## ✅ Final Launch Checklist

- [ ] All tests passing
- [ ] Backend deployed and stable
- [ ] Extension loaded and working
- [ ] OAuth flows tested
- [ ] Search functionality verified
- [ ] Performance meets targets (<3s)
- [ ] Security checklist complete
- [ ] Documentation updated
- [ ] Team trained on usage
- [ ] Support process defined

---

**Last Updated:** January 2024

**Remember:** Take your time with each phase. It's better to launch correctly than quickly!