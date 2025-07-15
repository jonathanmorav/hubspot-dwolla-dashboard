import express from 'express'
import cors from 'cors'
import axios from 'axios'
import dotenv from 'dotenv'
import crypto from 'crypto'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Dwolla Client Credentials token cache
let dwollaClientToken = null
let dwollaTokenExpiry = null

// User session management
const userSessions = new Map() // sessionId -> { extensionId, created, lastUsed, requestCount }

// Middleware
app.use(express.json())
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from Chrome extensions
    if (!origin || origin.startsWith('chrome-extension://')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}))

// Generate session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex')
}

// Validate API key middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key']
  const extensionId = req.headers['x-extension-id']
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  // Optionally validate extension ID against whitelist
  if (process.env.ALLOWED_EXTENSION_IDS) {
    const allowedIds = process.env.ALLOWED_EXTENSION_IDS.split(',')
    if (!allowedIds.includes(extensionId)) {
      return res.status(403).json({ error: 'Extension not allowed' })
    }
  }
  
  next()
}

// Session management middleware for proxy endpoints
const validateSession = (req, res, next) => {
  const sessionToken = req.headers['x-session-token']
  const extensionId = req.headers['x-extension-id']
  
  if (!sessionToken || !extensionId) {
    return res.status(401).json({ error: 'Missing session credentials' })
  }
  
  const session = userSessions.get(sessionToken)
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' })
  }
  
  // Check if session matches extension ID
  if (session.extensionId !== extensionId) {
    return res.status(403).json({ error: 'Session mismatch' })
  }
  
  // Check session expiry (24 hours)
  const sessionAge = Date.now() - session.created
  if (sessionAge > 24 * 60 * 60 * 1000) {
    userSessions.delete(sessionToken)
    return res.status(401).json({ error: 'Session expired' })
  }
  
  // Update last used time and request count
  session.lastUsed = Date.now()
  session.requestCount++
  
  // Check rate limit (100 requests per hour per session)
  const hourAgo = Date.now() - 60 * 60 * 1000
  if (session.requestCount > 100 && session.created > hourAgo) {
    return res.status(429).json({ error: 'Rate limit exceeded' })
  }
  
  req.session = session
  next()
}

// OAuth token exchange endpoint
app.post('/api/oauth/exchange', validateApiKey, async (req, res) => {
  const { code, provider, redirect_uri } = req.body
  const extensionId = req.headers['x-extension-id']
  
  // Enhanced logging for debugging
  console.log('Token exchange request:', {
    provider,
    hasCode: !!code,
    codeLength: code?.length,
    redirect_uri,
    extensionId,
    expectedExtensionId: process.env.ALLOWED_EXTENSION_IDS,
    extensionIdMatch: !process.env.ALLOWED_EXTENSION_IDS || process.env.ALLOWED_EXTENSION_IDS.includes(extensionId)
  })
  
  if (!code || !provider) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }
  
  try {
    let tokenResponse
    
    if (provider === 'hubspot') {
      console.log(`Attempting HubSpot token exchange with redirect_uri: ${redirect_uri}`)
      tokenResponse = await exchangeHubSpotCode(code, redirect_uri)
    } else if (provider === 'dwolla') {
      console.log(`Attempting Dwolla token exchange with redirect_uri: ${redirect_uri}`)
      tokenResponse = await exchangeDwollaCode(code, redirect_uri)
    } else {
      return res.status(400).json({ error: 'Invalid provider' })
    }
    
    console.log(`Token exchange successful for ${provider}`)
    
    // Never send refresh token to client in production
    // Store it securely on server if needed
    const response = {
      access_token: tokenResponse.access_token,
      expires_in: tokenResponse.expires_in || 3600
    }
    
    // In production, you might want to store refresh tokens in a secure database
    // associated with the user/extension for later use
    
    res.json(response)
  } catch (error) {
    console.error(`Token exchange error for ${provider}:`, {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data ? JSON.parse(error.config.data) : undefined
      }
    })
    
    // In development, return more detailed error
    if (process.env.NODE_ENV === 'development') {
      res.status(500).json({ 
        error: 'Token exchange failed',
        details: error.response?.data || error.message,
        provider
      })
    } else {
      res.status(500).json({ error: 'Token exchange failed' })
    }
  }
})

// Token refresh endpoint
app.post('/api/oauth/refresh', validateApiKey, async (req, res) => {
  const { refresh_token, provider } = req.body
  
  if (!refresh_token || !provider) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }
  
  try {
    let tokenResponse
    
    if (provider === 'hubspot') {
      tokenResponse = await refreshHubSpotToken(refresh_token)
    } else if (provider === 'dwolla') {
      tokenResponse = await refreshDwollaToken(refresh_token)
    } else {
      return res.status(400).json({ error: 'Invalid provider' })
    }
    
    const response = {
      access_token: tokenResponse.access_token,
      expires_in: tokenResponse.expires_in || 3600
    }
    
    res.json(response)
  } catch (error) {
    console.error(`Token refresh error for ${provider}:`, error.response?.data || error.message)
    res.status(500).json({ error: 'Token refresh failed' })
  }
})

// HubSpot OAuth functions
async function exchangeHubSpotCode(code, redirect_uri) {
  const payload = {
    grant_type: 'authorization_code',
    client_id: process.env.HUBSPOT_CLIENT_ID,
    client_secret: process.env.HUBSPOT_CLIENT_SECRET,
    redirect_uri: redirect_uri,
    code: code
  }
  
  console.log('HubSpot token exchange payload:', {
    grant_type: payload.grant_type,
    client_id: payload.client_id,
    redirect_uri: payload.redirect_uri,
    hasClientSecret: !!payload.client_secret,
    codeLength: code?.length
  })
  
  const response = await axios.post('https://api.hubapi.com/oauth/v1/token', 
    new URLSearchParams(payload),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  )
  
  return response.data
}

async function refreshHubSpotToken(refresh_token) {
  const payload = {
    grant_type: 'refresh_token',
    client_id: process.env.HUBSPOT_CLIENT_ID,
    client_secret: process.env.HUBSPOT_CLIENT_SECRET,
    refresh_token: refresh_token
  }
  
  const response = await axios.post('https://api.hubapi.com/oauth/v1/token',
    new URLSearchParams(payload),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  )
  
  return response.data
}

// Get Dwolla Client Credentials token
async function getDwollaClientToken() {
  // Check if we have a valid cached token
  if (dwollaClientToken && dwollaTokenExpiry && new Date() < dwollaTokenExpiry) {
    return dwollaClientToken
  }

  // Get new token using Client Credentials flow
  const authUrl = process.env.DWOLLA_ENVIRONMENT === 'production' 
    ? 'https://api.dwolla.com/token'
    : 'https://api-sandbox.dwolla.com/token'
  
  const auth = Buffer.from(
    `${process.env.DWOLLA_CLIENT_ID}:${process.env.DWOLLA_CLIENT_SECRET}`
  ).toString('base64')

  try {
    console.log('Obtaining new Dwolla Client Credentials token')
    
    const response = await axios.post(authUrl,
      new URLSearchParams({
        grant_type: 'client_credentials'
      }),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    dwollaClientToken = response.data.access_token
    // Set expiry 5 minutes before actual expiry for safety
    const expiresIn = response.data.expires_in || 3600
    dwollaTokenExpiry = new Date(Date.now() + (expiresIn - 300) * 1000)
    
    console.log(`Dwolla Client Credentials token obtained, expires at ${dwollaTokenExpiry.toISOString()}`)
    
    return dwollaClientToken
  } catch (error) {
    console.error('Failed to get Dwolla Client Credentials token:', error.response?.data || error.message)
    throw new Error('Failed to authenticate with Dwolla')
  }
}

// Dwolla OAuth functions
async function exchangeDwollaCode(code, redirect_uri) {
  const authUrl = process.env.DWOLLA_ENVIRONMENT === 'production' 
    ? 'https://api.dwolla.com/token'
    : 'https://api-sandbox.dwolla.com/token'
  
  const auth = Buffer.from(
    `${process.env.DWOLLA_CLIENT_ID}:${process.env.DWOLLA_CLIENT_SECRET}`
  ).toString('base64')
  
  console.log('Dwolla token exchange:', {
    authUrl,
    environment: process.env.DWOLLA_ENVIRONMENT,
    clientId: process.env.DWOLLA_CLIENT_ID,
    hasClientSecret: !!process.env.DWOLLA_CLIENT_SECRET,
    redirect_uri,
    codeLength: code?.length
  })
  
  const response = await axios.post(authUrl, 
    new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirect_uri
    }),
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  )
  
  return response.data
}

async function refreshDwollaToken(refresh_token) {
  const authUrl = process.env.DWOLLA_ENVIRONMENT === 'production' 
    ? 'https://api.dwolla.com/token'
    : 'https://api-sandbox.dwolla.com/token'
  
  const auth = Buffer.from(
    `${process.env.DWOLLA_CLIENT_ID}:${process.env.DWOLLA_CLIENT_SECRET}`
  ).toString('base64')
  
  const response = await axios.post(authUrl,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    }),
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  )
  
  return response.data
}

// Session creation endpoint
app.post('/api/session/create', validateApiKey, (req, res) => {
  const extensionId = req.headers['x-extension-id']
  
  if (!extensionId) {
    return res.status(400).json({ error: 'Extension ID required' })
  }
  
  const sessionToken = generateSessionToken()
  const session = {
    extensionId,
    created: Date.now(),
    lastUsed: Date.now(),
    requestCount: 0
  }
  
  userSessions.set(sessionToken, session)
  
  // Clean up old sessions periodically
  if (userSessions.size > 1000) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    for (const [token, session] of userSessions.entries()) {
      if (session.lastUsed < cutoff) {
        userSessions.delete(token)
      }
    }
  }
  
  console.log(`Session created for extension ${extensionId}`)
  
  res.json({
    sessionToken,
    expiresIn: 24 * 60 * 60 // 24 hours in seconds
  })
})

// Dwolla proxy endpoints
app.post('/api/proxy/dwolla/customers/search', validateSession, async (req, res) => {
  try {
    const token = await getDwollaClientToken()
    const { email, firstName, lastName, businessName, limit = 25, offset = 0 } = req.body
    
    // Build search parameters
    const params = new URLSearchParams()
    if (email) params.append('email', email)
    if (firstName) params.append('firstName', firstName)
    if (lastName) params.append('lastName', lastName)
    if (businessName) params.append('businessName', businessName)
    params.append('limit', limit.toString())
    params.append('offset', offset.toString())
    
    const apiUrl = process.env.DWOLLA_ENVIRONMENT === 'production'
      ? 'https://api.dwolla.com'
      : 'https://api-sandbox.dwolla.com'
    
    console.log(`Dwolla proxy search for session ${req.session.extensionId}:`, { email, firstName, lastName, businessName })
    
    const response = await axios.get(
      `${apiUrl}/customers?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.dwolla.v1.hal+json'
        }
      }
    )
    
    // Sanitize response - remove sensitive fields
    if (response.data._embedded?.customers) {
      response.data._embedded.customers = response.data._embedded.customers.map(customer => ({
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        businessName: customer.businessName,
        type: customer.type,
        status: customer.status,
        created: customer.created,
        _links: customer._links
      }))
    }
    
    res.json(response.data)
  } catch (error) {
    console.error('Dwolla proxy search error:', error.response?.data || error.message)
    res.status(error.response?.status || 500).json({ 
      error: 'Search failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to search customers'
    })
  }
})

app.get('/api/proxy/dwolla/customers/:id', validateSession, async (req, res) => {
  try {
    const token = await getDwollaClientToken()
    const { id } = req.params
    
    const apiUrl = process.env.DWOLLA_ENVIRONMENT === 'production'
      ? 'https://api.dwolla.com'
      : 'https://api-sandbox.dwolla.com'
    
    console.log(`Dwolla proxy get customer ${id} for session ${req.session.extensionId}`)
    
    const response = await axios.get(
      `${apiUrl}/customers/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.dwolla.v1.hal+json'
        }
      }
    )
    
    // Sanitize response - remove sensitive fields
    const sanitized = {
      id: response.data.id,
      firstName: response.data.firstName,
      lastName: response.data.lastName,
      email: response.data.email,
      businessName: response.data.businessName,
      type: response.data.type,
      status: response.data.status,
      created: response.data.created,
      address1: response.data.address1,
      city: response.data.city,
      state: response.data.state,
      postalCode: response.data.postalCode,
      _links: response.data._links
    }
    
    res.json(sanitized)
  } catch (error) {
    console.error('Dwolla proxy get customer error:', error.response?.data || error.message)
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to get customer',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to retrieve customer'
    })
  }
})

app.get('/api/proxy/dwolla/transfers/:id', validateSession, async (req, res) => {
  try {
    const token = await getDwollaClientToken()
    const { id } = req.params
    
    const apiUrl = process.env.DWOLLA_ENVIRONMENT === 'production'
      ? 'https://api.dwolla.com'
      : 'https://api-sandbox.dwolla.com'
    
    console.log(`Dwolla proxy get transfer ${id} for session ${req.session.extensionId}`)
    
    const response = await axios.get(
      `${apiUrl}/transfers/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.dwolla.v1.hal+json'
        }
      }
    )
    
    // Sanitize response
    const sanitized = {
      id: response.data.id,
      status: response.data.status,
      amount: response.data.amount,
      created: response.data.created,
      metadata: response.data.metadata,
      clearing: response.data.clearing,
      correlationId: response.data.correlationId,
      _links: response.data._links
    }
    
    res.json(sanitized)
  } catch (error) {
    console.error('Dwolla proxy get transfer error:', error.response?.data || error.message)
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to get transfer',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to retrieve transfer'
    })
  }
})

// Get customer transfers
app.get('/api/proxy/dwolla/customers/:id/transfers', validateSession, async (req, res) => {
  try {
    const token = await getDwollaClientToken()
    const { id } = req.params
    const { limit = '50', offset = '0' } = req.query
    
    const apiUrl = process.env.DWOLLA_ENVIRONMENT === 'production'
      ? 'https://api.dwolla.com'
      : 'https://api-sandbox.dwolla.com'
    
    console.log(`Dwolla proxy get transfers for customer ${id} for session ${req.session.extensionId}`)
    
    const response = await axios.get(
      `${apiUrl}/customers/${id}/transfers?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.dwolla.v1.hal+json'
        }
      }
    )
    
    // Sanitize response - keep only necessary fields
    if (response.data._embedded?.transfers) {
      response.data._embedded.transfers = response.data._embedded.transfers.map(transfer => ({
        id: transfer.id,
        status: transfer.status,
        amount: transfer.amount,
        created: transfer.created,
        metadata: transfer.metadata,
        clearing: transfer.clearing,
        correlationId: transfer.correlationId,
        individualAchId: transfer.individualAchId,
        _links: transfer._links
      }))
    }
    
    res.json(response.data)
  } catch (error) {
    console.error('Dwolla proxy get customer transfers error:', error.response?.data || error.message)
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to get customer transfers',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to retrieve transfers'
    })
  }
})

// Get customer funding sources
app.get('/api/proxy/dwolla/customers/:id/funding-sources', validateSession, async (req, res) => {
  try {
    const token = await getDwollaClientToken()
    const { id } = req.params
    
    const apiUrl = process.env.DWOLLA_ENVIRONMENT === 'production'
      ? 'https://api.dwolla.com'
      : 'https://api-sandbox.dwolla.com'
    
    console.log(`Dwolla proxy get funding sources for customer ${id} for session ${req.session.extensionId}`)
    
    const response = await axios.get(
      `${apiUrl}/customers/${id}/funding-sources`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.dwolla.v1.hal+json'
        }
      }
    )
    
    // Sanitize response - remove sensitive banking details
    if (response.data._embedded?.['funding-sources']) {
      response.data._embedded['funding-sources'] = response.data._embedded['funding-sources'].map(source => ({
        id: source.id,
        status: source.status,
        type: source.type,
        bankAccountType: source.bankAccountType,
        name: source.name,
        created: source.created,
        balance: source.balance,
        removed: source.removed,
        channels: source.channels,
        _links: source._links
      }))
    }
    
    res.json(response.data)
  } catch (error) {
    console.error('Dwolla proxy get funding sources error:', error.response?.data || error.message)
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to get funding sources',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to retrieve funding sources'
    })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  })
})

// Root endpoint for basic info
app.get('/', (req, res) => {
  res.json({ 
    service: 'OAuth Backend Service with Dwolla Proxy',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: [
      'POST /api/oauth/exchange',
      'POST /api/oauth/refresh', 
      'POST /api/session/create',
      'POST /api/proxy/dwolla/customers/search',
      'GET /api/proxy/dwolla/customers/:id',
      'GET /api/proxy/dwolla/transfers/:id',
      'GET /api/proxy/dwolla/customers/:id/transfers',
      'GET /api/proxy/dwolla/customers/:id/funding-sources',
      'GET /health'
    ]
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// Handle 404s
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 OAuth backend server running on port ${PORT}`)
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/health`)
  
  // Log important configuration
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Running in production mode')
  } else {
    console.log('🛠️  Running in development mode')
  }
})