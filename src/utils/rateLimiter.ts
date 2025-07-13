// Rate limiting service with logging

import { logger } from './logger'

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  provider?: string
}

export interface RateLimitState {
  count: number
  resetTime: number
}

export class RateLimitError extends Error {
  constructor(
    public provider: string,
    public resetTime: number,
    public limit: number
  ) {
    super(`Rate limit exceeded for ${provider}. Resets at ${new Date(resetTime).toISOString()}`)
    this.name = 'RateLimitError'
  }
}

export class RateLimiter {
  private configs: Map<string, RateLimitConfig> = new Map()
  private states: Map<string, RateLimitState> = new Map()
  
  constructor() {
    // Default rate limits based on PRD (100 searches per hour)
    this.addLimit('hubspot', { maxRequests: 50, windowMs: 60 * 60 * 1000, provider: 'hubspot' })
    this.addLimit('dwolla', { maxRequests: 50, windowMs: 60 * 60 * 1000, provider: 'dwolla' })
    this.addLimit('global', { maxRequests: 100, windowMs: 60 * 60 * 1000 })
    
    // Load saved states
    this.loadStates()
  }
  
  addLimit(key: string, config: RateLimitConfig): void {
    this.configs.set(key, config)
    logger.debug('Rate limit configured', {
      key,
      provider: config.provider || key,
      maxRequests: config.maxRequests,
      windowMs: config.windowMs
    })
  }
  
  async checkLimit(provider: string): Promise<void> {
    await Promise.all([
      this.check(provider),
      this.check('global')
    ])
  }
  
  private async check(key: string): Promise<void> {
    const config = this.configs.get(key)
    if (!config) {
      logger.warn(`No rate limit config for ${key}`)
      return
    }
    
    const now = Date.now()
    let state = this.states.get(key)
    
    // Initialize or reset state
    if (!state || now > state.resetTime) {
      state = {
        count: 0,
        resetTime: now + config.windowMs
      }
      this.states.set(key, state)
      await this.saveStates()
    }
    
    // Check limit
    if (state.count >= config.maxRequests) {
      const error = new RateLimitError(
        config.provider || key,
        state.resetTime,
        config.maxRequests
      )
      
      logger.warn('Rate limit exceeded', {
        provider: config.provider || key,
        count: state.count,
        limit: config.maxRequests,
        resetTime: state.resetTime,
        remainingTime: state.resetTime - now
      })
      
      throw error
    }
    
    // Increment counter
    state.count++
    await this.saveStates()
    
    // Log rate limit status
    const remaining = config.maxRequests - state.count
    const percentUsed = (state.count / config.maxRequests) * 100
    
    logger.debug('Rate limit checked', {
      provider: config.provider || key,
      used: state.count,
      limit: config.maxRequests,
      remaining,
      percentUsed: Math.round(percentUsed),
      resetTime: state.resetTime
    })
    
    // Warn when approaching limit
    if (percentUsed >= 80) {
      logger.warn('Approaching rate limit', {
        provider: config.provider || key,
        remaining,
        percentUsed: Math.round(percentUsed)
      })
    }
  }
  
  async getRemainingRequests(provider: string): Promise<number> {
    const config = this.configs.get(provider)
    const state = this.states.get(provider)
    
    if (!config || !state) {
      return 0
    }
    
    const now = Date.now()
    if (now > state.resetTime) {
      return config.maxRequests
    }
    
    return Math.max(0, config.maxRequests - state.count)
  }
  
  async getResetTime(provider: string): Promise<number> {
    const state = this.states.get(provider)
    return state?.resetTime || 0
  }
  
  async reset(provider?: string): Promise<void> {
    if (provider) {
      this.states.delete(provider)
    } else {
      this.states.clear()
    }
    await this.saveStates()
    
    logger.info('Rate limits reset', { provider: provider || 'all' })
  }
  
  private async loadStates(): Promise<void> {
    try {
      const { rateLimitStates } = await chrome.storage.local.get('rateLimitStates')
      if (rateLimitStates) {
        // Convert stored object back to Map
        for (const [key, state] of Object.entries(rateLimitStates)) {
          this.states.set(key, state as RateLimitState)
        }
        logger.debug('Rate limit states loaded', { 
          providers: Object.keys(rateLimitStates) 
        })
      }
    } catch (error) {
      logger.error('Failed to load rate limit states', error as Error)
    }
  }
  
  private async saveStates(): Promise<void> {
    try {
      // Convert Map to object for storage
      const rateLimitStates: Record<string, RateLimitState> = {}
      for (const [key, state] of this.states) {
        rateLimitStates[key] = state
      }
      
      await chrome.storage.local.set({ rateLimitStates })
    } catch (error) {
      logger.error('Failed to save rate limit states', error as Error)
    }
  }
  
  // Get current status for all providers
  async getStatus(): Promise<Record<string, {
    used: number
    limit: number
    remaining: number
    resetTime: number
    percentUsed: number
  }>> {
    const status: Record<string, any> = {}
    
    for (const [key, config] of this.configs) {
      const state = this.states.get(key)
      const now = Date.now()
      
      if (!state || now > state.resetTime) {
        status[key] = {
          used: 0,
          limit: config.maxRequests,
          remaining: config.maxRequests,
          resetTime: now + config.windowMs,
          percentUsed: 0
        }
      } else {
        status[key] = {
          used: state.count,
          limit: config.maxRequests,
          remaining: config.maxRequests - state.count,
          resetTime: state.resetTime,
          percentUsed: Math.round((state.count / config.maxRequests) * 100)
        }
      }
    }
    
    return status
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()