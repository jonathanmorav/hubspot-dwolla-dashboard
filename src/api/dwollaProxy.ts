// Dwolla Proxy Client - Uses backend proxy with Client Credentials authentication
import { env } from '../config/env'
import { logger } from '../utils/logger'

const BACKEND_API_URL = env.VITE_BACKEND_API_URL || 'http://localhost:3001'
const API_KEY = env.VITE_API_KEY || 'development-key'

// Session token management
let sessionToken: string | null = null
let sessionExpiry: Date | null = null

interface SessionResponse {
  sessionToken: string
  expiresIn: number
}

interface ProxyError {
  error: string
  message?: string
}

export class DwollaProxyError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'DwollaProxyError'
  }
}

// Get or create session token
async function getSessionToken(): Promise<string> {
  // Check if we have a valid cached token
  if (sessionToken && sessionExpiry && new Date() < sessionExpiry) {
    return sessionToken
  }

  // Create new session
  try {
    logger.info('Creating new Dwolla proxy session')
    
    const response = await fetch(`${BACKEND_API_URL}/api/session/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-Extension-ID': chrome.runtime.id
      }
    })

    if (!response.ok) {
      const error = await response.json() as ProxyError
      throw new DwollaProxyError(
        error.error || `Session creation failed: ${response.status}`,
        response.status
      )
    }

    const data = await response.json() as SessionResponse
    
    sessionToken = data.sessionToken
    // Set expiry 5 minutes before actual expiry for safety
    sessionExpiry = new Date(Date.now() + (data.expiresIn - 300) * 1000)
    
    logger.info('Dwolla proxy session created', {
      expiresAt: sessionExpiry.toISOString()
    })
    
    return sessionToken
  } catch (error) {
    logger.error('Failed to create Dwolla proxy session', error as Error)
    throw error
  }
}

// Make authenticated proxy request
async function proxyRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getSessionToken()
  
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': token,
      'X-Extension-ID': chrome.runtime.id,
      ...options.headers
    }
  }

  try {
    const response = await fetch(
      `${BACKEND_API_URL}/api/proxy/dwolla${endpoint}`,
      requestOptions
    )

    if (!response.ok) {
      // Handle session expiry
      if (response.status === 401) {
        sessionToken = null
        sessionExpiry = null
        
        // Retry once with new session
        const newToken = await getSessionToken()
        requestOptions.headers = {
          ...requestOptions.headers,
          'X-Session-Token': newToken
        }
        
        const retryResponse = await fetch(
          `${BACKEND_API_URL}/api/proxy/dwolla${endpoint}`,
          requestOptions
        )
        
        if (!retryResponse.ok) {
          const error = await retryResponse.json() as ProxyError
          throw new DwollaProxyError(
            error.error || error.message || `Proxy request failed: ${retryResponse.status}`,
            retryResponse.status
          )
        }
        
        return retryResponse.json()
      }
      
      const error = await response.json() as ProxyError
      throw new DwollaProxyError(
        error.error || error.message || `Proxy request failed: ${response.status}`,
        response.status
      )
    }

    return response.json()
  } catch (error) {
    if (error instanceof DwollaProxyError) {
      throw error
    }
    
    logger.error('Dwolla proxy request failed', error as Error, {
      endpoint,
      method: options.method || 'GET'
    })
    
    throw new DwollaProxyError('Network error', 0, 'NETWORK_ERROR')
  }
}

// Dwolla Proxy API Methods
export const dwollaProxy = {
  // Search customers
  async searchCustomers(params: {
    email?: string
    firstName?: string
    lastName?: string
    businessName?: string
    limit?: number
    offset?: number
  }): Promise<any> {
    return proxyRequest('/customers/search', {
      method: 'POST',
      body: JSON.stringify(params)
    })
  },

  // Get customer by ID
  async getCustomer(customerId: string): Promise<any> {
    return proxyRequest(`/customers/${customerId}`)
  },

  // Get customer transfers
  async getCustomerTransfers(customerId: string, limit = 50): Promise<any> {
    return proxyRequest(`/customers/${customerId}/transfers?limit=${limit}`)
  },

  // Get transfer by ID
  async getTransfer(transferId: string): Promise<any> {
    return proxyRequest(`/transfers/${transferId}`)
  },

  // Get customer funding sources
  async getCustomerFundingSources(customerId: string): Promise<any> {
    return proxyRequest(`/customers/${customerId}/funding-sources`)
  },

  // Clear session (for logout)
  clearSession(): void {
    sessionToken = null
    sessionExpiry = null
    logger.info('Dwolla proxy session cleared')
  }
}