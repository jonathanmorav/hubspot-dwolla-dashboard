// Enhanced API client with logging, retry logic, and caching

import { logger, generateRequestId, LogTimer } from './logger'
import { rateLimiter, RateLimitError } from './rateLimiter'
import { getAccessToken } from './auth'
import { env } from '../config/env'
import { 
  HubSpotContactSearchResponse, 
  HubSpotCompanySearchResponse,
  DwollaCustomerSearchResponse,
  DwollaTransferSearchResponse 
} from '../types'

// Types
export interface ApiConfig {
  baseUrl: string
  provider: 'hubspot' | 'dwolla'
  maxRetries?: number
  retryDelay?: number
  timeout?: number
  cache?: boolean
  cacheTTL?: number
}

export interface RequestOptions extends RequestInit {
  skipCache?: boolean
  skipRateLimit?: boolean
  retryCount?: number
}

export interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public provider?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Simple in-memory cache
export class ApiCache {
  private cache: Map<string, CacheEntry> = new Map()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
    
    logger.debug('Cache set', { key, ttl: ttl || this.defaultTTL })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      logger.debug('Cache expired', { key })
      return null
    }

    logger.debug('Cache hit', { key })
    return entry.data
  }

  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    logger.info('Cache cleared', { entriesCleared: size })
  }

  getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET'
    const body = options?.body ? JSON.stringify(options.body) : ''
    return `${method}:${url}:${body}`
  }
}

// Enhanced API Client
export class EnhancedApiClient {
  protected config: ApiConfig
  protected cache: ApiCache
  protected requestQueue: Map<string, Promise<any>> = new Map()

  constructor(config: ApiConfig) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 10000,
      cache: true,
      cacheTTL: 5 * 60 * 1000,
      ...config
    }
    this.cache = new ApiCache()
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const requestId = generateRequestId()
    const url = `${this.config.baseUrl}${endpoint}`
    const timer = logger.startTimer('api_request')
    
    // Check cache first
    if (this.config.cache && !options.skipCache && options.method === 'GET') {
      const cacheKey = this.cache.getCacheKey(url, options)
      const cached = this.cache.get(cacheKey)
      if (cached) {
        logger.info('API request served from cache', {
          requestId,
          endpoint,
          provider: this.config.provider,
          cached: true
        })
        return cached
      }
    }

    // Deduplicate concurrent requests
    const dedupeKey = this.cache.getCacheKey(url, options)
    if (this.requestQueue.has(dedupeKey)) {
      logger.debug('Request deduplicated', {
        requestId,
        endpoint,
        provider: this.config.provider
      })
      return this.requestQueue.get(dedupeKey)
    }

    // Create request promise
    const requestPromise = this.executeRequest<T>(
      url, 
      endpoint, 
      options, 
      requestId, 
      timer
    )

    // Store in queue
    this.requestQueue.set(dedupeKey, requestPromise)

    try {
      const result = await requestPromise
      return result
    } finally {
      // Remove from queue
      this.requestQueue.delete(dedupeKey)
    }
  }

  private async executeRequest<T>(
    url: string,
    endpoint: string,
    options: RequestOptions,
    requestId: string,
    timer: LogTimer
  ): Promise<T> {
    try {
      // Check rate limit
      if (!options.skipRateLimit) {
        await rateLimiter.checkLimit(this.config.provider)
      }

      // Get fresh access token
      const token = await getAccessToken(this.config.provider)
      if (!token) {
        throw new ApiError('No access token available', 401, 'NO_TOKEN', this.config.provider)
      }

      // Make request with retry logic
      const response = await this.executeWithRetry(
        url,
        {
          ...options,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        },
        requestId,
        options.retryCount || 0
      )

      const duration = timer.end()
      
      // Parse response
      const data = await this.parseResponse<T>(response)

      // Log success
      logger.info('API request completed', {
        requestId,
        endpoint,
        method: options.method || 'GET',
        status: response.status,
        duration: Math.round(duration),
        provider: this.config.provider
      })

      // Log performance
      await logger.logPerformance('api_request', duration, {
        endpoint,
        provider: this.config.provider,
        status: response.status
      })

      // Cache successful GET requests
      if (this.config.cache && options.method === 'GET' && response.ok) {
        const cacheKey = this.cache.getCacheKey(url, options)
        this.cache.set(cacheKey, data, this.config.cacheTTL)
      }

      return data

    } catch (error) {
      const duration = timer.end()
      
      // Enhanced error logging
      logger.error('API request failed', error as Error, {
        requestId,
        endpoint,
        method: options.method || 'GET',
        provider: this.config.provider,
        duration: Math.round(duration),
        errorType: error instanceof RateLimitError ? 'rate_limit' : 'api_error'
      })

      throw error
    }
  }

  private async executeWithRetry(
    url: string,
    options: RequestInit,
    requestId: string,
    retryCount: number
  ): Promise<Response> {
    try {
      // Add timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout!)
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      // Check if we should retry
      if (!response.ok && this.shouldRetry(response.status, retryCount)) {
        throw new ApiError(
          `API returned ${response.status}`,
          response.status,
          undefined,
          this.config.provider
        )
      }

      return response

    } catch (error) {
      // Handle network errors and timeouts
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('Request timeout', 408, 'TIMEOUT', this.config.provider)
        }
        
        // Retry logic
        if (retryCount < this.config.maxRetries!) {
          const delay = this.getRetryDelay(retryCount)
          
          logger.warn('Retrying API request', {
            requestId,
            url,
            retryCount: retryCount + 1,
            maxRetries: this.config.maxRetries,
            delay,
            error: error.message
          })

          await this.sleep(delay)
          
          return this.executeWithRetry(
            url,
            options,
            requestId,
            retryCount + 1
          )
        }
      }

      throw error
    }
  }

  private shouldRetry(status: number, retryCount: number): boolean {
    // Don't retry if we've exhausted retries
    if (retryCount >= this.config.maxRetries!) {
      return false
    }

    // Retry on specific status codes
    const retryableStatuses = [429, 500, 502, 503, 504]
    return retryableStatuses.includes(status)
  }

  private getRetryDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.config.retryDelay!
    const exponentialDelay = baseDelay * Math.pow(2, retryCount)
    const jitter = Math.random() * 1000
    return exponentialDelay + jitter
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')
    
    if (!response.ok) {
      let errorBody
      try {
        errorBody = contentType?.includes('application/json') 
          ? await response.json() 
          : await response.text()
      } catch {
        errorBody = 'Failed to parse error response'
      }

      throw new ApiError(
        errorBody.message || errorBody.error || `API error: ${response.status}`,
        response.status,
        errorBody.code,
        this.config.provider
      )
    }

    if (contentType?.includes('application/json')) {
      return response.json()
    }

    // Return text for non-JSON responses
    return response.text() as any
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear()
  }

  // Get cache stats
  getCacheStats(): { size: number } {
    return {
      size: (this.cache as any).cache.size
    }
  }
}

// Enhanced HubSpot Client
export class EnhancedHubSpotClient extends EnhancedApiClient {
  constructor() {
    super({
      baseUrl: 'https://api.hubapi.com',
      provider: 'hubspot'
    })
  }

  async searchContacts(email: string): Promise<HubSpotContactSearchResponse> {
    const searchRequest = {
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ',
          value: email
        }]
      }],
      properties: ['firstname', 'lastname', 'email', 'phone', 'company']
    }

    return this.request<HubSpotContactSearchResponse>('/crm/v3/objects/contacts/search', {
      method: 'POST',
      body: JSON.stringify(searchRequest)
    })
  }

  async searchCompanies(query: string): Promise<HubSpotCompanySearchResponse> {
    const searchRequest = {
      filterGroups: [{
        filters: [{
          propertyName: 'name',
          operator: 'CONTAINS_TOKEN',
          value: query
        }]
      }],
      properties: ['name', 'domain', 'dwolla_id', 'onboarding_step', 'onboarding_status', 'sob', 'associated_policies'],
      limit: 100
    }

    return this.request<HubSpotCompanySearchResponse>('/crm/v3/objects/companies/search', {
      method: 'POST',
      body: JSON.stringify(searchRequest)
    })
  }

  async searchByName(name: string): Promise<{ contacts: any[], companies: any[] }> {
    // Search both contacts and companies by name
    const [contacts, companies] = await Promise.allSettled([
      this.searchContactsByName(name),
      this.searchCompanies(name)
    ])

    return {
      contacts: contacts.status === 'fulfilled' ? contacts.value.results : [],
      companies: companies.status === 'fulfilled' ? companies.value.results : []
    }
  }

  private async searchContactsByName(name: string): Promise<any> {
    const nameParts = name.split(' ')
    const filters = []

    if (nameParts.length >= 2) {
      // Search by first and last name
      filters.push({
        propertyName: 'firstname',
        operator: 'CONTAINS_TOKEN',
        value: nameParts[0]
      }, {
        propertyName: 'lastname',
        operator: 'CONTAINS_TOKEN',
        value: nameParts[nameParts.length - 1]
      })
    } else {
      // Search in both first and last name
      filters.push({
        propertyName: 'firstname',
        operator: 'CONTAINS_TOKEN',
        value: name
      })
    }

    const searchRequest = {
      filterGroups: [{ filters }],
      properties: ['firstname', 'lastname', 'email', 'phone', 'company'],
      limit: 100
    }

    return this.request('/crm/v3/objects/contacts/search', {
      method: 'POST',
      body: JSON.stringify(searchRequest)
    })
  }
}

// Enhanced Dwolla Client - Now uses proxy instead of direct OAuth
import { dwollaProxy, DwollaProxyError } from '../api/dwollaProxy'

export class EnhancedDwollaClient extends EnhancedApiClient {
  constructor() {
    const environment = env.VITE_DWOLLA_ENVIRONMENT || 'sandbox'
    super({
      baseUrl: environment === 'production' 
        ? 'https://api.dwolla.com' 
        : 'https://api-sandbox.dwolla.com',
      provider: 'dwolla'
    })
  }

  // Override the request method to use proxy
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const requestId = generateRequestId()
    const timer = logger.startTimer('dwolla_proxy_request')
    
    try {
      // Check rate limit
      if (!options.skipRateLimit) {
        await rateLimiter.checkLimit(this.config.provider)
      }

      // Log the request
      logger.info('Dwolla proxy request starting', {
        requestId,
        endpoint,
        method: options.method || 'GET',
        provider: this.config.provider
      })

      // Route to appropriate proxy method based on endpoint
      let result: any
      
      // Parse the endpoint to determine which proxy method to call
      if (endpoint.includes('/customers?email=')) {
        const emailMatch = endpoint.match(/email=([^&]+)/)
        const email = emailMatch ? decodeURIComponent(emailMatch[1]) : ''
        result = await dwollaProxy.searchCustomers({ email, limit: 100 })
      } else if (endpoint === '/customers?limit=200') {
        // For name search, we get all customers
        result = await dwollaProxy.searchCustomers({ limit: 200 })
      } else if (endpoint.match(/^\/customers\/([^\/]+)\/transfers/)) {
        const matches = endpoint.match(/^\/customers\/([^\/]+)\/transfers\?limit=(\d+)/)
        const customerId = matches?.[1] || ''
        const limit = matches?.[2] ? parseInt(matches[2]) : 50
        result = await dwollaProxy.getCustomerTransfers(customerId, limit)
      } else if (endpoint.match(/^\/transfers\/(.+)$/)) {
        const transferId = endpoint.match(/^\/transfers\/(.+)$/)?.[1] || ''
        result = await dwollaProxy.getTransfer(transferId)
      } else {
        throw new ApiError('Unsupported Dwolla endpoint for proxy', 400, 'UNSUPPORTED_ENDPOINT', 'dwolla')
      }

      const duration = timer.end()
      
      // Log success
      logger.info('Dwolla proxy request completed', {
        requestId,
        endpoint,
        method: options.method || 'GET',
        duration: Math.round(duration),
        provider: this.config.provider
      })

      // Log performance
      await logger.logPerformance('dwolla_proxy_request', duration, {
        endpoint,
        provider: this.config.provider
      })

      return result as T

    } catch (error) {
      const duration = timer.end()
      
      // Convert DwollaProxyError to ApiError
      if (error instanceof DwollaProxyError) {
        throw new ApiError(error.message, error.status, error.code, 'dwolla')
      }
      
      // Enhanced error logging
      logger.error('Dwolla proxy request failed', error as Error, {
        requestId,
        endpoint,
        method: options.method || 'GET',
        provider: this.config.provider,
        duration: Math.round(duration),
        errorType: error instanceof RateLimitError ? 'rate_limit' : 'proxy_error'
      })

      throw error
    }
  }

  async searchCustomers(email: string): Promise<DwollaCustomerSearchResponse> {
    return this.request<DwollaCustomerSearchResponse>(`/customers?email=${encodeURIComponent(email)}&limit=100`)
  }

  async searchCustomersByName(name: string): Promise<DwollaCustomerSearchResponse> {
    // Dwolla doesn't have direct name search, so we'll need to filter results
    const allCustomers = await this.request<DwollaCustomerSearchResponse>('/customers?limit=200')
    
    if (!allCustomers._embedded?.customers) {
      return { _embedded: { customers: [] } }
    }

    const nameLower = name.toLowerCase()
    const filtered = allCustomers._embedded.customers.filter((customer) => {
      const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase()
      const businessName = customer.businessName?.toLowerCase() || ''
      return fullName.includes(nameLower) || businessName.includes(nameLower)
    })

    return { _embedded: { customers: filtered } }
  }

  async getCustomerTransfers(customerId: string, limit = 50): Promise<DwollaTransferSearchResponse> {
    return this.request<DwollaTransferSearchResponse>(`/customers/${customerId}/transfers?limit=${limit}`)
  }

  async getTransferById(id: string): Promise<any> {
    return this.request(`/transfers/${id}`)
  }
}