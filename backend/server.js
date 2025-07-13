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
  
  if (!code || !provider) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }
  
  try {
    let tokenResponse
    
    if (provider === 'hubspot') {
      tokenResponse = await exchangeHubSpotCode(code, redirect_uri)
    } else if (provider === 'dwolla') {
      tokenResponse = await exchangeDwollaCode(code, redirect_uri)
    } else {
      return res.status(400).json({ error: 'Invalid provider' })
    }
    
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
    console.error(`Token exchange error for ${provider}:`, error.response?.data || error.message)
    res.status(500).json({ error: 'Token exchange failed' })
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
  const response = await axios.post('https://api.hubapi.com/oauth/v1/token', {
    grant_type: 'authorization_code',
    client_id: process.env.HUBSPOT_CLIENT_ID,
    client_secret: process.env.HUBSPOT_CLIENT_SECRET,
    redirect_uri: redirect_uri,
    code: code
  })
  
  return response.data
}

async function refreshHubSpotToken(refresh_token) {
  const response = await axios.post('https://api.hubapi.com/oauth/v1/token', {
    grant_type: 'refresh_token',
    client_id: process.env.HUBSPOT_CLIENT_ID,
    client_secret: process.env.HUBSPOT_CLIENT_SECRET,
    refresh_token: refresh_token
  })
  
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
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
app.listen(PORT, () => {
  console.log(`OAuth backend server running on port ${PORT}`)
  console.log('Environment:', process.env.NODE_ENV || 'development')
})