import { logger } from './logger'

export interface SearchHistoryItem {
  id: string
  query: string
  queryType: 'email' | 'name' | 'business' | 'phone'
  timestamp: number
  resultCount: number
  linkedAccounts: number
  searchDuration: number
}

export interface SearchPattern {
  pattern: string
  frequency: number
  lastUsed: number
  avgResultCount: number
}

/**
 * Manages search history and provides intelligent suggestions
 */
export class SearchHistoryService {
  private readonly STORAGE_KEY = 'search_history'
  private readonly PATTERNS_KEY = 'search_patterns'
  private readonly MAX_HISTORY_ITEMS = 50
  private readonly MAX_PATTERNS = 20
  
  /**
   * Add a search to history
   */
  async addSearch(item: Omit<SearchHistoryItem, 'id' | 'timestamp'>): Promise<void> {
    try {
      const history = await this.getHistory()
      const newItem: SearchHistoryItem = {
        ...item,
        id: this.generateId(),
        timestamp: Date.now()
      }
      
      // Remove duplicate searches (same query within last hour)
      const oneHourAgo = Date.now() - (60 * 60 * 1000)
      const filteredHistory = history.filter(h => 
        !(h.query.toLowerCase() === item.query.toLowerCase() && h.timestamp > oneHourAgo)
      )
      
      // Add new search and limit size
      const updatedHistory = [newItem, ...filteredHistory].slice(0, this.MAX_HISTORY_ITEMS)
      
      await chrome.storage.local.set({ [this.STORAGE_KEY]: updatedHistory })
      
      // Update search patterns
      await this.updateSearchPatterns(item.query, item.queryType)
      
      logger.info('Search added to history', {
        query: item.query.substring(0, 20),
        type: item.queryType,
        resultCount: item.resultCount
      })
    } catch (error) {
      logger.error('Failed to add search to history', error as Error)
    }
  }
  
  /**
   * Get search history
   */
  async getHistory(): Promise<SearchHistoryItem[]> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY)
      return result[this.STORAGE_KEY] || []
    } catch (error) {
      logger.error('Failed to get search history', error as Error)
      return []
    }
  }
  
  /**
   * Get recent searches (last 10)
   */
  async getRecentSearches(): Promise<SearchHistoryItem[]> {
    const history = await this.getHistory()
    return history.slice(0, 10)
  }
  
  /**
   * Get frequently searched patterns
   */
  async getFrequentPatterns(): Promise<SearchPattern[]> {
    try {
      const result = await chrome.storage.local.get(this.PATTERNS_KEY)
      const patterns: SearchPattern[] = result[this.PATTERNS_KEY] || []
      
      // Sort by frequency and recency
      return patterns
        .sort((a, b) => {
          const aScore = a.frequency * 0.7 + (a.lastUsed / Date.now()) * 0.3
          const bScore = b.frequency * 0.7 + (b.lastUsed / Date.now()) * 0.3
          return bScore - aScore
        })
        .slice(0, 5)
    } catch (error) {
      logger.error('Failed to get search patterns', error as Error)
      return []
    }
  }
  
  /**
   * Get search suggestions based on input
   */
  async getSuggestions(input: string): Promise<string[]> {
    if (input.length < 2) return []
    
    const [history, patterns] = await Promise.all([
      this.getHistory(),
      this.getFrequentPatterns()
    ])
    
    const suggestions = new Set<string>()
    const lowerInput = input.toLowerCase()
    
    // Add matching history items
    history
      .filter(item => item.query.toLowerCase().includes(lowerInput))
      .slice(0, 5)
      .forEach(item => suggestions.add(item.query))
    
    // Add matching patterns
    patterns
      .filter(pattern => pattern.pattern.toLowerCase().includes(lowerInput))
      .slice(0, 3)
      .forEach(pattern => suggestions.add(pattern.pattern))
    
    return Array.from(suggestions).slice(0, 5)
  }
  
  /**
   * Clear search history
   */
  async clearHistory(): Promise<void> {
    try {
      await chrome.storage.local.remove([this.STORAGE_KEY, this.PATTERNS_KEY])
      logger.info('Search history cleared')
    } catch (error) {
      logger.error('Failed to clear search history', error as Error)
    }
  }
  
  /**
   * Get search statistics
   */
  async getStatistics(): Promise<{
    totalSearches: number
    avgResultCount: number
    avgSearchDuration: number
    topQueryTypes: Array<{ type: string; count: number }>
    searchesByDay: Array<{ date: string; count: number }>
  }> {
    const history = await this.getHistory()
    
    if (history.length === 0) {
      return {
        totalSearches: 0,
        avgResultCount: 0,
        avgSearchDuration: 0,
        topQueryTypes: [],
        searchesByDay: []
      }
    }
    
    // Calculate statistics
    const totalSearches = history.length
    const avgResultCount = history.reduce((sum, item) => sum + item.resultCount, 0) / totalSearches
    const avgSearchDuration = history.reduce((sum, item) => sum + item.searchDuration, 0) / totalSearches
    
    // Group by query type
    const typeGroups = history.reduce((acc, item) => {
      acc[item.queryType] = (acc[item.queryType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const topQueryTypes = Object.entries(typeGroups)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
    
    // Group by day (last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    const recentSearches = history.filter(item => item.timestamp > sevenDaysAgo)
    
    const dayGroups = recentSearches.reduce((acc, item) => {
      const date = new Date(item.timestamp).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const searchesByDay = Object.entries(dayGroups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    return {
      totalSearches,
      avgResultCount: Math.round(avgResultCount * 10) / 10,
      avgSearchDuration: Math.round(avgSearchDuration),
      topQueryTypes,
      searchesByDay
    }
  }
  
  /**
   * Update search patterns
   */
  private async updateSearchPatterns(query: string, queryType: string): Promise<void> {
    try {
      const result = await chrome.storage.local.get(this.PATTERNS_KEY)
      const patterns: SearchPattern[] = result[this.PATTERNS_KEY] || []
      
      // Extract pattern from query
      const pattern = this.extractPattern(query, queryType)
      if (!pattern) return
      
      // Find existing pattern or create new one
      const existingIndex = patterns.findIndex(p => p.pattern === pattern)
      
      if (existingIndex >= 0) {
        // Update existing pattern
        patterns[existingIndex].frequency += 1
        patterns[existingIndex].lastUsed = Date.now()
      } else {
        // Add new pattern
        patterns.push({
          pattern,
          frequency: 1,
          lastUsed: Date.now(),
          avgResultCount: 0
        })
      }
      
      // Limit patterns and save
      const limitedPatterns = patterns
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, this.MAX_PATTERNS)
      
      await chrome.storage.local.set({ [this.PATTERNS_KEY]: limitedPatterns })
    } catch (error) {
      logger.error('Failed to update search patterns', error as Error)
    }
  }
  
  /**
   * Extract searchable pattern from query
   */
  private extractPattern(query: string, queryType: string): string | null {
    const normalized = query.toLowerCase().trim()
    
    switch (queryType) {
      case 'email':
        // Extract domain for email patterns
        const emailMatch = normalized.match(/@([^.]+\.[^.]+)$/)
        return emailMatch ? `*@${emailMatch[1]}` : null
      
      case 'business':
        // Extract business type patterns
        const businessKeywords = ['inc', 'llc', 'corp', 'ltd', 'company', 'co', 'group']
        for (const keyword of businessKeywords) {
          if (normalized.includes(keyword)) {
            return `*${keyword}*`
          }
        }
        return null
      
      case 'name':
        // Don't create patterns for personal names (privacy)
        return null
      
      default:
        return null
    }
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Export singleton instance
export const searchHistoryService = new SearchHistoryService()