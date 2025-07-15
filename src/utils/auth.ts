// Secure OAuth token management
import { env } from '../config/env'

// Backend API configuration - should match your deployed backend URL
const BACKEND_API_URL = env.VITE_BACKEND_API_URL || 'http://localhost:3001'
const API_KEY = env.VITE_API_KEY || 'development-key'

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  error?: string
}

interface StoredToken {
  access_token: string
  refresh_token?: string
  expires_at: number
}

// Exchange authorization code for tokens via backend service
export async function exchangeCodeForToken(
  code: string, 
  provider: 'hubspot' | 'dwolla'
): Promise<TokenResponse> {
  try {
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

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || `Exchange failed: ${response.status}`)
    }

    const tokenData = await response.json() as TokenResponse
    
    if (tokenData.error) {
      throw new Error(tokenData.error)
    }

    // Store tokens securely with expiration
    await storeTokens(provider, tokenData)
    
    return tokenData
  } catch (error) {
    console.error(`Token exchange failed for ${provider}:`, error)
    throw error
  }
}

// Store tokens securely in Chrome storage
async function storeTokens(
  provider: 'hubspot' | 'dwolla', 
  tokenData: TokenResponse
): Promise<void> {
  const storageData: StoredToken = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: Date.now() + (tokenData.expires_in * 1000)
  }

  // Store both token and auth state in local storage for persistence
  // Note: In production, consider encrypting tokens before storage
  await chrome.storage.local.set({
    [`${provider}_token`]: storageData,
    [`${provider}_authenticated`]: true,
    [`${provider}_last_auth`]: Date.now()
  })
}

// Get valid access token (refresh if needed)
export async function getAccessToken(
  provider: 'hubspot' | 'dwolla'
): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(`${provider}_token`)
    const tokenData = result[`${provider}_token`] as StoredToken | undefined

    if (!tokenData) {
      return null
    }

    // Check if token is expired or will expire in next 5 minutes
    const expiresIn = tokenData.expires_at - Date.now()
    if (expiresIn < 5 * 60 * 1000) {
      // Token expired or expiring soon, refresh it
      if (tokenData.refresh_token) {
        const newToken = await refreshAccessToken(provider, tokenData.refresh_token)
        return newToken.access_token
      } else {
        // No refresh token, user must re-authenticate
        await clearTokens(provider)
        return null
      }
    }

    return tokenData.access_token
  } catch (error) {
    console.error(`Failed to get access token for ${provider}:`, error)
    return null
  }
}

// Refresh access token using refresh token
async function refreshAccessToken(
  provider: 'hubspot' | 'dwolla',
  refreshToken: string
): Promise<TokenResponse> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/oauth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-Extension-ID': chrome.runtime.id
      },
      body: JSON.stringify({ 
        refresh_token: refreshToken,
        provider 
      })
    })

    if (!response.ok) {
      throw new Error(`Refresh failed: ${response.status}`)
    }

    const tokenData = await response.json() as TokenResponse
    
    // Store new tokens
    await storeTokens(provider, tokenData)
    
    return tokenData
  } catch (error) {
    console.error(`Token refresh failed for ${provider}:`, error)
    // Clear tokens on refresh failure
    await clearTokens(provider)
    throw error
  }
}

// Clear tokens for a provider
export async function clearTokens(provider: 'hubspot' | 'dwolla'): Promise<void> {
  await chrome.storage.local.remove([
    `${provider}_token`,
    `${provider}_authenticated`,
    `${provider}_last_auth`
  ])
}

// Clear all authentication data
export async function clearAllTokens(): Promise<void> {
  await clearTokens('hubspot')
  await clearTokens('dwolla')
}

// Check if user is authenticated with a provider
export async function isAuthenticated(provider: 'hubspot' | 'dwolla'): Promise<boolean> {
  try {
    // Check basic auth flag
    const result = await chrome.storage.local.get(`${provider}_authenticated`)
    if (!result[`${provider}_authenticated`]) {
      return false
    }

    // Verify token exists and is not expired
    const tokenData = await chrome.storage.local.get(`${provider}_token`)
    const token = tokenData[`${provider}_token`] as StoredToken | undefined

    if (!token || !token.access_token) {
      await clearTokens(provider)
      return false
    }

    // Check if token is expired
    if (token.expires_at && Date.now() > token.expires_at) {
      // Try to refresh if we have a refresh token
      if (token.refresh_token) {
        try {
          await refreshAccessToken(provider, token.refresh_token)
          return true
        } catch {
          await clearTokens(provider)
          return false
        }
      } else {
        await clearTokens(provider)
        return false
      }
    }

    return true
  } catch (error) {
    console.error(`Error checking auth status for ${provider}:`, error)
    return false
  }
}

// Check if both services are authenticated - simplified approach
// Just check the boolean flags set by the service worker, skip complex token validation
export async function checkAuthStatus(): Promise<{
  hubspot: boolean
  dwolla: boolean
  isFullyAuthenticated: boolean
  requiresReauth: string[]
}> {
  try {
    // Simple check of authentication flags set by service worker
    const result = await chrome.storage.local.get([
      'hubspot_authenticated', 
      'dwolla_authenticated'
    ])
    
    const hubspotAuth = !!result.hubspot_authenticated
    const dwollaAuth = !!result.dwolla_authenticated

    const requiresReauth: string[] = []
    if (!hubspotAuth) requiresReauth.push('hubspot')
    if (!dwollaAuth) requiresReauth.push('dwolla')

    return {
      hubspot: hubspotAuth,
      dwolla: dwollaAuth,
      isFullyAuthenticated: hubspotAuth && dwollaAuth,
      requiresReauth
    }
  } catch (error) {
    console.error('Error checking auth status:', error)
    return {
      hubspot: false,
      dwolla: false,
      isFullyAuthenticated: false,
      requiresReauth: ['hubspot', 'dwolla']
    }
  }
}

// Validate token permissions
export async function validateTokenPermissions(
  provider: 'hubspot' | 'dwolla'
): Promise<{ valid: boolean; missingScopes?: string[] }> {
  // In a real implementation, these would be used to verify token scopes
  // const requiredScopes = {
  //   hubspot: ['crm.objects.contacts.read', 'crm.objects.companies.read'],
  //   dwolla: ['Customers:read', 'Transfers:read']
  // }

  try {
    const token = await getAccessToken(provider)
    if (!token) {
      return { valid: false }
    }

    // In a real implementation, you would decode the token or make an API call
    // to verify the scopes. For now, we'll assume valid if token exists
    return { valid: true }
  } catch {
    return { valid: false }
  }
}