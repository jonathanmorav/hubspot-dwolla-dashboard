// Background service worker for Chrome extension

// Message types
interface AuthMessage {
  type: 'AUTHENTICATE'
  provider: 'hubspot' | 'dwolla'
}

interface SearchMessage {
  type: 'SEARCH_CUSTOMER'
  query: string
}

interface TransfersMessage {
  type: 'GET_TRANSFERS'
  customerId: string
}

interface DebugMessage {
  type: 'GET_LOGS' | 'CLEAR_LOGS' | 'GET_RATE_LIMIT_STATUS' | 'GET_PERFORMANCE_METRICS'
  filter?: any
}

type Message = AuthMessage | SearchMessage | TransfersMessage | DebugMessage

// Session management
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

// Set up alarm for session timeout
chrome.alarms.create('session-timeout', { periodInMinutes: 1 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'session-timeout') {
    checkSessionTimeout()
  }
})

async function checkSessionTimeout() {
  const { lastActivity } = await chrome.storage.session.get('lastActivity')
  if (lastActivity && Date.now() - lastActivity > SESSION_TIMEOUT) {
    // Import auth utility and clear all tokens
    const { clearAllTokens } = await import('../utils/auth')
    await clearAllTokens()
    
    // Clear all session data
    await chrome.storage.session.clear()
  }
}

// Update activity timestamp
async function updateActivity() {
  await chrome.storage.session.set({ lastActivity: Date.now() })
}

// Message handler with comprehensive logging
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  // Import logger dynamically
  import('../utils/logger').then(({ logger, generateRequestId }) => {
    const requestId = generateRequestId()
    
    logger.info('Message received', {
      requestId,
      messageType: message.type,
      sender: sender.tab?.id || 'popup',
      origin: sender.origin || 'extension'
    })
    
    updateActivity()

    const timer = logger.startTimer(`handle_${message.type}`)
    
    const handleResponse = (response: any) => {
      const duration = timer.end()
      logger.info('Message handled', {
        requestId,
        messageType: message.type,
        success: !response.error,
        duration: Math.round(duration)
      })
      sendResponse(response)
    }
    
    const handleError = (error: Error) => {
      const duration = timer.end()
      logger.error('Message handling failed', error, {
        requestId,
        messageType: message.type,
        duration: Math.round(duration)
      })
      sendResponse({ success: false, error: error.message })
    }

    switch (message.type) {
      case 'AUTHENTICATE':
        handleAuthentication(message.provider)
          .then(handleResponse)
          .catch(handleError)
        return true

      case 'SEARCH_CUSTOMER':
        handleSearch(message.query)
          .then(handleResponse)
          .catch(handleError)
        return true

      case 'GET_TRANSFERS':
        handleGetTransfers(message.customerId)
          .then(handleResponse)
          .catch(handleError)
        return true

      case 'GET_LOGS':
        handleGetLogs((message as DebugMessage).filter)
          .then(handleResponse)
          .catch(handleError)
        return true

      case 'CLEAR_LOGS':
        handleClearLogs()
          .then(handleResponse)
          .catch(handleError)
        return true

      case 'GET_RATE_LIMIT_STATUS':
        handleGetRateLimitStatus()
          .then(handleResponse)
          .catch(handleError)
        return true

      case 'GET_PERFORMANCE_METRICS':
        handleGetPerformanceMetrics()
          .then(handleResponse)
          .catch(handleError)
        return true

      default:
        logger.warn('Unknown message type', { 
          requestId, 
          messageType: (message as any).type 
        })
        sendResponse({ error: 'Unknown message type' })
    }
  })
  
  return true // Keep channel open for async response
})

// Authentication handlers
async function handleAuthentication(provider: 'hubspot' | 'dwolla') {
  try {
    if (provider === 'hubspot') {
      return await authenticateHubSpot()
    } else {
      return await authenticateDwolla()
    }
  } catch (error) {
    console.error(`Authentication error for ${provider}:`, error)
    throw error
  }
}

async function authenticateHubSpot() {
  // HubSpot OAuth configuration
  const clientId = import.meta.env?.VITE_HUBSPOT_CLIENT_ID
  
  if (!clientId) {
    throw new Error('HubSpot client ID not configured. Please set VITE_HUBSPOT_CLIENT_ID environment variable.')
  }
  
  const redirectUri = chrome.identity.getRedirectURL()
  const scope = 'crm.objects.contacts.read crm.objects.companies.read'
  
  const authUrl = `https://app.hubspot.com/oauth/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `response_type=code`

  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    })

    if (!responseUrl) {
      throw new Error('No response URL received')
    }

    // Extract authorization code from response
    const url = new URL(responseUrl)
    const code = url.searchParams.get('code')
    
    if (!code) {
      throw new Error('No authorization code received')
    }

    // Import auth utility dynamically to avoid circular dependencies
    const { exchangeCodeForToken } = await import('../utils/auth')
    
    // Exchange code for token via secure backend service
    await exchangeCodeForToken(code, 'hubspot')
    
    return { success: true }
  } catch (error) {
    console.error('HubSpot auth error:', error)
    throw error
  }
}

async function authenticateDwolla() {
  // Dwolla OAuth configuration
  const clientId = import.meta.env?.VITE_DWOLLA_CLIENT_ID
  
  if (!clientId) {
    throw new Error('Dwolla client ID not configured. Please set VITE_DWOLLA_CLIENT_ID environment variable.')
  }
  
  const redirectUri = chrome.identity.getRedirectURL()
  const scope = 'Customers:read Transfers:read'
  const environment = import.meta.env?.VITE_DWOLLA_ENVIRONMENT || 'sandbox'
  
  const authUrl = `https://accounts${environment === 'sandbox' ? '-sandbox' : ''}.dwolla.com/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `response_type=code`

  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    })

    if (!responseUrl) {
      throw new Error('No response URL received')
    }

    // Extract authorization code from response
    const url = new URL(responseUrl)
    const code = url.searchParams.get('code')
    
    if (!code) {
      throw new Error('No authorization code received')
    }

    // Import auth utility dynamically to avoid circular dependencies
    const { exchangeCodeForToken } = await import('../utils/auth')
    
    // Exchange code for token via secure backend service
    await exchangeCodeForToken(code, 'dwolla')
    
    return { success: true }
  } catch (error) {
    console.error('Dwolla auth error:', error)
    throw error
  }
}

// Search handler with comprehensive logging
async function handleSearch(query: string) {
  const { logger, generateRequestId, detectQueryType } = await import('../utils/logger')
  const requestId = generateRequestId()
  const timer = logger.startTimer('search_operation')
  
  try {
    const queryType = detectQueryType(query)
    
    logger.info('Search initiated', {
      requestId,
      queryLength: query.length,
      queryType,
      sanitizedQuery: queryType === 'email' ? query.replace(/^(.{3}).*@/, '$1***@') : query.substring(0, 20)
    })
    
    // Import auth utility
    const { getAccessToken } = await import('../utils/auth')
    
    // Get valid access tokens
    const tokenTimer = logger.startTimer('token_retrieval')
    const [hubspotToken, dwollaToken] = await Promise.all([
      getAccessToken('hubspot'),
      getAccessToken('dwolla')
    ])
    const tokenDuration = tokenTimer.end()
    
    logger.debug('Tokens retrieved', {
      requestId,
      hubspotAvailable: !!hubspotToken,
      dwollaAvailable: !!dwollaToken,
      duration: Math.round(tokenDuration)
    })

    if (!hubspotToken || !dwollaToken) {
      throw new Error('Not authenticated with both services')
    }

    // Perform parallel API calls
    const apiTimer = logger.startTimer('api_calls')
    const [hubspotData, dwollaData] = await Promise.all([
      searchHubSpot(query, hubspotToken),
      searchDwolla(query, dwollaToken)
    ])
    const apiDuration = apiTimer.end()
    
    const totalDuration = timer.end()
    
    // Log results
    logger.info('Search completed', {
      requestId,
      queryType,
      totalDuration: Math.round(totalDuration),
      apiDuration: Math.round(apiDuration),
      resultCounts: {
        hubspotContacts: hubspotData.contacts.length,
        hubspotCompanies: hubspotData.companies.length,
        dwollaCustomers: dwollaData.customers.length
      }
    })
    
    // Performance warning if approaching 3-second target
    if (totalDuration > 2500) {
      logger.warn('Search performance warning', {
        requestId,
        duration: Math.round(totalDuration),
        threshold: 3000,
        queryType
      })
    }
    
    // Log performance metric
    await logger.logPerformance('search_operation', totalDuration, {
      queryType,
      resultCount: hubspotData.contacts.length + hubspotData.companies.length + dwollaData.customers.length
    })

    // Import correlation service
    const { dataCorrelationService } = await import('../utils/dataCorrelation')
    
    // Correlate the data
    const correlationTimer = logger.startTimer('data_correlation')
    const correlatedData = dataCorrelationService.correlateSearchResults(
      hubspotData.companies,
      hubspotData.contacts,
      dwollaData.customers,
      dwollaData.transfers
    )
    const correlationDuration = correlationTimer.end()
    
    // Calculate summary statistics
    const summary = {
      totalResults: correlatedData.length,
      linkedAccounts: correlatedData.filter(d => d.correlation.isLinked).length,
      unlinkedHubSpot: correlatedData.filter(d => d.hubspot.company && !d.dwolla.customer).length,
      unlinkedDwolla: correlatedData.filter(d => !d.hubspot.company && d.dwolla.customer).length,
      inconsistencyCount: correlatedData.reduce((count, d) => count + d.correlation.inconsistencies.length, 0)
    }
    
    logger.info('Data correlation completed', {
      requestId,
      correlationDuration: Math.round(correlationDuration),
      summary
    })

    return {
      success: true,
      hubspot: hubspotData,
      dwolla: dwollaData,
      correlatedData,
      summary
    }
  } catch (error) {
    const duration = timer.end()
    
    logger.error('Search failed', error as Error, {
      requestId,
      duration: Math.round(duration),
      query: query.substring(0, 50) // Truncate for privacy
    })
    
    throw error
  }
}

async function searchHubSpot(query: string, _token: string) {
  const { EnhancedHubSpotClient } = await import('../utils/apiEnhanced')
  const { detectQueryType } = await import('../utils/logger')
  
  const client = new EnhancedHubSpotClient()
  const queryType = detectQueryType(query)
  
  try {
    if (queryType === 'email') {
      const contactsResponse = await client.searchContacts(query)
      return {
        contacts: contactsResponse.results || [],
        companies: []
      }
    } else {
      const results = await client.searchByName(query)
      return {
        contacts: results.contacts || [],
        companies: results.companies || []
      }
    }
  } catch (error) {
    console.error('HubSpot search error:', error)
    return {
      companies: [],
      contacts: []
    }
  }
}

async function searchDwolla(query: string, _token: string) {
  const { EnhancedDwollaClient } = await import('../utils/apiEnhanced')
  const { detectQueryType } = await import('../utils/logger')
  
  const client = new EnhancedDwollaClient()
  const queryType = detectQueryType(query)
  
  try {
    let customersResponse
    
    if (queryType === 'email') {
      customersResponse = await client.searchCustomers(query)
    } else {
      customersResponse = await client.searchCustomersByName(query)
    }
    
    return {
      customers: customersResponse._embedded?.customers || [],
      transfers: []
    }
  } catch (error) {
    console.error('Dwolla search error:', error)
    return {
      customers: [],
      transfers: []
    }
  }
}

async function handleGetTransfers(customerId: string) {
  try {
    // Import auth utility
    const { getAccessToken } = await import('../utils/auth')
    
    const dwollaToken = await getAccessToken('dwolla')
    
    if (!dwollaToken) {
      throw new Error('Not authenticated with Dwolla')
    }

    // TODO: Implement actual Dwolla API call to get transfers
    // This is a placeholder implementation
    const transfers = await getDwollaTransfers(customerId, dwollaToken)
    
    return {
      success: true,
      transfers
    }
  } catch (error) {
    console.error('Get transfers error:', error)
    throw error
  }
}

async function getDwollaTransfers(customerId: string, _token: string) {
  const { EnhancedDwollaClient } = await import('../utils/apiEnhanced')
  
  const client = new EnhancedDwollaClient()
  
  try {
    const response = await client.getCustomerTransfers(customerId)
    return response._embedded?.transfers || []
  } catch (error) {
    console.error('Failed to get transfers:', error)
    return []
  }
}

// Debug handlers
async function handleGetLogs(filter?: any) {
  const { logger } = await import('../utils/logger')
  const logs = await logger.getLogs(filter)
  return { logs }
}

async function handleClearLogs() {
  const { logger } = await import('../utils/logger')
  await logger.clearLogs()
  return { success: true }
}

async function handleGetRateLimitStatus() {
  const { rateLimiter } = await import('../utils/rateLimiter')
  const status = await rateLimiter.getStatus()
  return { status }
}

async function handleGetPerformanceMetrics() {
  const { logger } = await import('../utils/logger')
  const logs = await logger.getLogs({ level: 1 }) // INFO level
  
  const metrics = logs
    .filter(log => log.context.operation && log.context.duration)
    .map(log => ({
      operation: log.context.operation,
      duration: log.context.duration,
      timestamp: log.context.timestamp
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50)
  
  return { metrics }
}

// Clear all data when extension is unloaded
chrome.runtime.onSuspend.addListener(() => {
  chrome.storage.session.clear()
})

export {}