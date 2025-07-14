// Comprehensive logging system for Chrome extension
import { env } from '../config/env'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogContext {
  requestId?: string
  userId?: string
  provider?: 'hubspot' | 'dwolla' | string
  operation?: string
  searchQuery?: string
  timestamp: number
  extensionVersion: string
  environment: 'development' | 'production'
  [key: string]: any
}

export interface LogEntry {
  level: LogLevel
  message: string
  context: LogContext
  error?: {
    message: string
    stack?: string
    code?: string
  }
  duration?: number
}

export interface LoggerConfig {
  level: LogLevel
  maxLogs?: number
  maxAge?: number
  console?: boolean
  sanitize?: boolean
}

// Timer for performance tracking
export class LogTimer {
  private startTime: number

  constructor() {
    this.startTime = performance.now()
  }

  end(): number {
    return performance.now() - this.startTime
  }
}

// Sanitizer to remove sensitive data
export class LogSanitizer {
  private emailRegex = /([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g
  private tokenRegex = /(token|key|secret|password)["']?\s*[:=]\s*["']?([^"'\s,}]+)/gi
  private customerIdRegex = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi

  sanitize(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data)
    }
    
    if (typeof data === 'object' && data !== null) {
      return this.sanitizeObject(data)
    }
    
    return data
  }

  private sanitizeString(str: string): string {
    // Replace emails with masked version
    str = str.replace(this.emailRegex, (_match, user, domain) => {
      return `${user.substring(0, 2)}***@${domain}`
    })
    
    // Remove tokens/secrets
    str = str.replace(this.tokenRegex, '$1=[REDACTED]')
    
    // Hash customer IDs
    str = str.replace(this.customerIdRegex, '[CUSTOMER_ID]')
    
    return str
  }

  private sanitizeObject(obj: any): any {
    const sanitized: any = Array.isArray(obj) ? [] : {}
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Skip sensitive keys entirely
        if (this.isSensitiveKey(key)) {
          sanitized[key] = '[REDACTED]'
        } else {
          sanitized[key] = this.sanitize(obj[key])
        }
      }
    }
    
    return sanitized
  }

  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'authorization',
      'access_token', 'refresh_token', 'client_secret'
    ]
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    )
  }
}

// Chrome storage based log store
export class ChromeLogStore {
  private maxLogs: number
  private maxAge: number

  constructor(maxLogs = 1000, maxAge = 24 * 60 * 60 * 1000) {
    this.maxLogs = maxLogs
    this.maxAge = maxAge
  }

  async store(log: LogEntry): Promise<void> {
    try {
      const { logs = [] } = await chrome.storage.local.get('logs')
      
      // Add new log
      logs.push(log)
      
      // Rotate if needed
      const rotated = this.rotate(logs)
      
      await chrome.storage.local.set({ logs: rotated })
    } catch (error) {
      console.error('Failed to store log:', error)
    }
  }

  async getLogs(filter?: Partial<LogEntry>): Promise<LogEntry[]> {
    const { logs = [] } = await chrome.storage.local.get('logs')
    
    if (!filter) {
      return logs
    }
    
    return logs.filter((log: LogEntry) => {
      for (const key in filter) {
        if (log[key as keyof LogEntry] !== filter[key as keyof LogEntry]) {
          return false
        }
      }
      return true
    })
  }

  async clear(): Promise<void> {
    await chrome.storage.local.remove('logs')
  }

  async export(): Promise<LogEntry[]> {
    const { logs = [] } = await chrome.storage.local.get('logs')
    return logs
  }

  private rotate(logs: LogEntry[]): LogEntry[] {
    const now = Date.now()
    
    // Remove old logs
    let filtered = logs.filter(log => 
      (now - log.context.timestamp) < this.maxAge
    )
    
    // Keep only maxLogs most recent
    if (filtered.length > this.maxLogs) {
      filtered = filtered.slice(-this.maxLogs)
    }
    
    return filtered
  }
}

// Main Logger class
export class Logger {
  private config: LoggerConfig
  private store: ChromeLogStore
  private sanitizer: LogSanitizer
  private static instance: Logger

  constructor(config: LoggerConfig) {
    this.config = config
    this.store = new ChromeLogStore(config.maxLogs, config.maxAge)
    this.sanitizer = new LogSanitizer()
  }

  static getInstance(config?: LoggerConfig): Logger {
    if (!Logger.instance && config) {
      Logger.instance = new Logger(config)
    }
    return Logger.instance
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level
  }

  private async log(
    level: LogLevel, 
    message: string, 
    context?: Partial<LogContext>,
    error?: Error
  ): Promise<void> {
    if (!this.shouldLog(level)) {
      return
    }

    const logEntry: LogEntry = {
      level,
      message,
      context: {
        timestamp: Date.now(),
        extensionVersion: chrome.runtime.getManifest().version,
        environment: env.MODE === 'production' ? 'production' : 'development',
        ...context
      }
    }

    if (error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    }

    // Sanitize if enabled
    if (this.config.sanitize) {
      logEntry.message = this.sanitizer.sanitize(logEntry.message)
      logEntry.context = this.sanitizer.sanitize(logEntry.context)
      if (logEntry.error) {
        logEntry.error = this.sanitizer.sanitize(logEntry.error)
      }
    }

    // Store log
    await this.store.store(logEntry)

    // Console output if enabled
    if (this.config.console) {
      this.consoleLog(logEntry)
    }
  }

  private consoleLog(entry: LogEntry): void {
    const prefix = `[${LogLevel[entry.level]}] ${new Date(entry.context.timestamp).toISOString()}`
    const message = `${prefix} - ${entry.message}`
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.context)
        break
      case LogLevel.INFO:
        console.info(message, entry.context)
        break
      case LogLevel.WARN:
        console.warn(message, entry.context)
        break
      case LogLevel.ERROR:
        console.error(message, entry.context, entry.error)
        break
    }
  }

  debug(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error, context?: Partial<LogContext>): void {
    this.log(LogLevel.ERROR, message, context, error)
  }

  startTimer(_operation: string): LogTimer {
    return new LogTimer()
  }

  async logPerformance(
    operation: string, 
    duration: number, 
    metadata?: any
  ): Promise<void> {
    const level = duration > 3000 ? LogLevel.WARN : LogLevel.INFO
    await this.log(level, `Performance: ${operation}`, {
      operation,
      duration: Math.round(duration),
      ...metadata
    })
  }

  async getLogs(filter?: Partial<LogEntry>): Promise<LogEntry[]> {
    return this.store.getLogs(filter)
  }

  async clearLogs(): Promise<void> {
    return this.store.clear()
  }

  async exportLogs(): Promise<LogEntry[]> {
    return this.store.export()
  }
}

// Create singleton instance
export const logger = Logger.getInstance({
  level: env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
  console: env.DEV,
  sanitize: true,
  maxLogs: 1000,
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
})

// Utility functions
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function detectQueryType(query: string): 'email' | 'name' | 'business' | 'unknown' {
  if (query.includes('@')) return 'email'
  if (query.includes('inc') || query.includes('llc') || query.includes('corp')) return 'business'
  if (query.split(' ').length >= 2) return 'name'
  return 'unknown'
}