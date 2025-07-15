import express from 'express'
import cors from 'cors'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

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
    service: 'OAuth Backend Service',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: [
      'POST /api/oauth/exchange',
      'POST /api/oauth/refresh', 
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