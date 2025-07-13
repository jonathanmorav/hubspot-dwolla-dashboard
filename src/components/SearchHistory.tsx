import React, { useState, useEffect, useCallback } from 'react'
import { SearchHistoryItem, searchHistoryService } from '../utils/searchHistory'
import './SearchHistory.css'

interface SearchHistoryProps {
  onSelectSearch: (query: string) => void
  currentQuery: string
  isVisible: boolean
  onClose: () => void
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  onSelectSearch,
  currentQuery,
  isVisible,
  onClose
}) => {
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [loading, setLoading] = useState(false)

  // Load recent searches
  const loadRecentSearches = useCallback(async () => {
    try {
      const recent = await searchHistoryService.getRecentSearches()
      setRecentSearches(recent)
    } catch (error) {
      console.error('Failed to load recent searches:', error)
    }
  }, [])

  // Load suggestions based on current query
  const loadSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    try {
      const suggestions = await searchHistoryService.getSuggestions(query)
      setSuggestions(suggestions)
    } catch (error) {
      console.error('Failed to load suggestions:', error)
      setSuggestions([])
    }
  }, [])

  // Load data when visible
  useEffect(() => {
    if (isVisible) {
      loadRecentSearches()
      if (currentQuery) {
        loadSuggestions(currentQuery)
      }
    }
  }, [isVisible, currentQuery, loadRecentSearches, loadSuggestions])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return

      const items = suggestions.length > 0 ? suggestions : recentSearches.map(s => s.query)
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % items.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => prev <= 0 ? items.length - 1 : prev - 1)
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < items.length) {
            onSelectSearch(items[selectedIndex])
            onClose()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        // Keyboard shortcuts for recent searches (Cmd/Ctrl + 1-5)
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            const index = parseInt(e.key) - 1
            if (recentSearches[index]) {
              onSelectSearch(recentSearches[index].query)
              onClose()
            }
          }
          break
      }
    }

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, selectedIndex, suggestions, recentSearches, onSelectSearch, onClose])

  // Clear history
  const handleClearHistory = useCallback(async () => {
    setLoading(true)
    try {
      await searchHistoryService.clearHistory()
      setRecentSearches([])
      setSuggestions([])
    } catch (error) {
      console.error('Failed to clear history:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Format relative time
  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  // Get query type icon
  const getQueryTypeIcon = (type: string): string => {
    switch (type) {
      case 'email': return '📧'
      case 'business': return '🏢'
      case 'name': return '👤'
      case 'phone': return '📞'
      default: return '🔍'
    }
  }

  // Get result count color
  const getResultCountClass = (count: number): string => {
    if (count === 0) return 'no-results'
    if (count < 3) return 'few-results'
    if (count < 10) return 'some-results'
    return 'many-results'
  }

  if (!isVisible) return null

  const showSuggestions = suggestions.length > 0
  const showRecentSearches = recentSearches.length > 0

  return (
    <div className="search-history-overlay" onClick={onClose}>
      <div className="search-history-panel" onClick={e => e.stopPropagation()}>
        <div className="search-history-header">
          <h3>
            {showSuggestions ? '💡 Suggestions' : '🕐 Recent Searches'}
          </h3>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close search history"
          >
            ✕
          </button>
        </div>

        <div className="search-history-content">
          {showSuggestions && (
            <div className="suggestions-section">
              <ul className="search-list">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion}
                    className={`search-item suggestion ${selectedIndex === index ? 'selected' : ''}`}
                    onClick={() => {
                      onSelectSearch(suggestion)
                      onClose()
                    }}
                  >
                    <div className="search-icon">💡</div>
                    <div className="search-details">
                      <div className="search-query">{suggestion}</div>
                      <div className="search-type">Suggestion</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showRecentSearches && (
            <div className="recent-searches-section">
              {showSuggestions && (
                <div className="section-divider">
                  <span>Recent Searches</span>
                </div>
              )}
              
              <ul className="search-list">
                {recentSearches.map((search, index) => {
                  const adjustedIndex = showSuggestions ? index + suggestions.length : index
                  return (
                    <li
                      key={search.id}
                      className={`search-item recent ${selectedIndex === adjustedIndex ? 'selected' : ''}`}
                      onClick={() => {
                        onSelectSearch(search.query)
                        onClose()
                      }}
                    >
                      <div className="search-icon">
                        {getQueryTypeIcon(search.queryType)}
                      </div>
                      <div className="search-details">
                        <div className="search-query">{search.query}</div>
                        <div className="search-meta">
                          <span className="search-time">
                            {formatRelativeTime(search.timestamp)}
                          </span>
                          <span className={`result-count ${getResultCountClass(search.resultCount)}`}>
                            {search.resultCount} result{search.resultCount !== 1 ? 's' : ''}
                          </span>
                          {search.linkedAccounts > 0 && (
                            <span className="linked-accounts">
                              🔗 {search.linkedAccounts} linked
                            </span>
                          )}
                        </div>
                      </div>
                      {index < 5 && (
                        <div className="keyboard-shortcut">
                          ⌘{index + 1}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {!showSuggestions && !showRecentSearches && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <p>No search history yet</p>
              <small>Your recent searches will appear here</small>
            </div>
          )}
        </div>

        {showRecentSearches && (
          <div className="search-history-footer">
            <div className="keyboard-hints">
              <span>↑↓ Navigate</span>
              <span>Enter Select</span>
              <span>⌘1-5 Quick select</span>
              <span>Esc Close</span>
            </div>
            <button
              className="clear-history-button"
              onClick={handleClearHistory}
              disabled={loading}
            >
              {loading ? 'Clearing...' : 'Clear History'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}