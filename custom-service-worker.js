// Service worker for Chrome Extension - OAuth handling with persistence
// Uses local storage for token persistence (matching auth.ts)

const VITE_HUBSPOT_CLIENT_ID = '4e69a57d-eb8b-45ef-9088-c822b0eb4d08';
const VITE_DWOLLA_CLIENT_ID = 'aaEBh0JXyCHGdDT8sUvgQn3bWys61zdrXbCPcwU1WkhdMqMVZX';
const VITE_DWOLLA_ENVIRONMENT = 'sandbox';
const VITE_BACKEND_API_URL = 'http://localhost:3001';
const VITE_API_KEY = 'development-key';

// OAuth token exchange function
async function exchangeCodeForToken(code, provider) {
  console.log(`Exchanging code for ${provider} token`);
  
  // Log critical debugging information
  const extensionId = chrome.runtime.id;
  const redirectUri = chrome.identity.getRedirectURL();
  console.log('Extension ID:', extensionId);
  console.log('Redirect URI:', redirectUri);
  console.log('Expected Extension ID in Railway:', 'aepmimpminhofdledloibnbchocmnkgo');
  console.log('IDs Match:', extensionId === 'aepmimpminhofdledloibnbchocmnkgo');
  
  try {
    const response = await fetch(`${VITE_BACKEND_API_URL}/api/oauth/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': VITE_API_KEY,
        'X-Extension-ID': extensionId
      },
      body: JSON.stringify({
        code,
        provider,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();
    
    // Store token data in local storage for persistence (matches auth.ts)
    const tokenData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000)
    };
    
    // Store both token and auth state in local storage for persistence
    await chrome.storage.local.set({
      [`${provider}_token`]: tokenData,
      [`${provider}_authenticated`]: true,
      [`${provider}_last_auth`]: Date.now(),
      // Update session activity
      'session_last_activity': Date.now(),
      'session_active': true
    });

    console.log(`${provider} authentication successful`);
    
    // Notify popup of auth success
    chrome.runtime.sendMessage({
      type: 'AUTH_STATE_CHANGED',
      provider: provider,
      authenticated: true
    }).catch(() => {
      // Popup might be closed, that's okay
    });
    
    return data;
  } catch (error) {
    console.error(`Token exchange error for ${provider}:`, error);
    throw error;
  }
}

// Get stored token
async function getAccessToken(provider) {
  // Check authentication flag in local storage
  const authResult = await chrome.storage.local.get(`${provider}_authenticated`);
  if (!authResult[`${provider}_authenticated`]) {
    return null;
  }
  
  // Get token data from local storage
  const tokenResult = await chrome.storage.local.get(`${provider}_token`);
  const tokenData = tokenResult[`${provider}_token`];
  
  if (!tokenData || !tokenData.access_token) {
    return null;
  }
  
  // Check if token is expired
  if (tokenData.expires_at && Date.now() > tokenData.expires_at) {
    console.log(`${provider} token expired`);
    await clearAuthData(provider);
    return null;
  }
  
  return tokenData.access_token;
}

// Clear auth data
async function clearAuthData(provider) {
  if (provider) {
    // Clear from local storage
    await chrome.storage.local.remove([
      `${provider}_token`,
      `${provider}_authenticated`,
      `${provider}_last_auth`
    ]);
  } else {
    // Clear all auth data
    await chrome.storage.local.remove([
      'hubspot_token', 'hubspot_authenticated', 'hubspot_last_auth',
      'dwolla_token', 'dwolla_authenticated', 'dwolla_last_auth'
    ]);
  }
}

// Authenticate with HubSpot
async function authenticateHubSpot() {
  const clientId = VITE_HUBSPOT_CLIENT_ID;
  
  if (!clientId) {
    throw new Error('HubSpot client ID not configured. Please set VITE_HUBSPOT_CLIENT_ID environment variable.');
  }

  const redirectUrl = chrome.identity.getRedirectURL();
  const scope = 'crm.objects.contacts.read crm.objects.companies.read';
  
  const authUrl = `https://app.hubspot.com/oauth/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `response_type=code`;

  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    });

    if (!responseUrl) {
      throw new Error('No response URL received');
    }

    const url = new URL(responseUrl);
    const code = url.searchParams.get('code');
    
    if (!code) {
      throw new Error('No authorization code received');
    }

    await exchangeCodeForToken(code, 'hubspot');
    return { success: true };
  } catch (error) {
    console.error('HubSpot auth error:', error);
    throw error;
  }
}

// Authenticate with Dwolla
async function authenticateDwolla() {
  const clientId = VITE_DWOLLA_CLIENT_ID;
  
  if (!clientId) {
    throw new Error('Dwolla client ID not configured. Please set VITE_DWOLLA_CLIENT_ID environment variable.');
  }

  const redirectUrl = chrome.identity.getRedirectURL();
  const scope = 'Customers:read Transfers:read';
  const environment = VITE_DWOLLA_ENVIRONMENT || 'sandbox';
  
  const authUrl = `https://accounts${environment === 'sandbox' ? '-sandbox' : ''}.dwolla.com/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUrl)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `response_type=code`;

  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    });

    if (!responseUrl) {
      throw new Error('No response URL received');
    }

    const url = new URL(responseUrl);
    const code = url.searchParams.get('code');
    
    if (!code) {
      throw new Error('No authorization code received');
    }

    await exchangeCodeForToken(code, 'dwolla');
    return { success: true };
  } catch (error) {
    console.error('Dwolla auth error:', error);
    throw error;
  }
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Service worker received message:', request.type);
  
  if (request.type === 'AUTHENTICATE') {
    const authPromise = request.provider === 'hubspot' 
      ? authenticateHubSpot() 
      : authenticateDwolla();
      
    authPromise
      .then(result => {
        console.log(`${request.provider} authentication successful`);
        sendResponse(result);
      })
      .catch(error => {
        console.error(`${request.provider} authentication failed:`, error);
        sendResponse({ success: false, error: error.message });
      });
      
    return true; // Will respond asynchronously
  }
  
  if (request.type === 'SEARCH_CUSTOMER' || request.type === 'GET_TRANSFERS') {
    // For now, just return mock data for testing
    sendResponse({ 
      success: true, 
      correlatedData: [], 
      summary: { 
        totalResults: 0, 
        linkedAccounts: 0,
        unlinkedHubSpot: 0,
        unlinkedDwolla: 0,
        inconsistencyCount: 0
      } 
    });
    return true;
  }
  
  // Default response
  sendResponse({ error: 'Unknown message type' });
  return true;
});

// Session management with proper timeout
chrome.alarms.create('session-check', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'session-check') {
    // Check session validity
    const result = await chrome.storage.local.get(['session_last_activity', 'session_active']);
    
    if (result.session_active && result.session_last_activity) {
      const lastActivity = result.session_last_activity;
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      // If more than 30 minutes of inactivity, clear session
      if (timeSinceLastActivity > 1800000) { // 30 minutes
        await clearAuthData();
        await chrome.storage.local.remove(['session_last_activity', 'session_active']);
        
        // Notify popup if open
        chrome.runtime.sendMessage({
          type: 'SESSION_EXPIRED',
          timestamp: now
        }).catch(() => {
          // Popup might be closed, that's okay
        });
      }
    }
  }
});

console.log('Service worker loaded successfully');
console.log('Extension ID:', chrome.runtime.id);
console.log('Redirect URI:', chrome.identity.getRedirectURL());