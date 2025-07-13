import { useState, useEffect, useCallback, useMemo } from 'react'
import { CorrelatedDataView } from '../components/CorrelatedDataView'
import { SearchHistory } from '../components/SearchHistory'
import { DebugPanel } from '../components/DebugPanel'
import { ErrorDisplay } from '../components/ErrorDisplay'
import { Header } from '../components/Header'
import { SkeletonCorrelatedData } from '../components/Skeleton'
import { CorrelatedSearchResults } from '../types'
import { CorrelatedCustomerData } from '../utils/dataCorrelation'
import { searchHistoryService } from '../utils/searchHistory'
import { checkAuthStatus, validateTokenPermissions } from '../utils/auth'
import { validateSearchQuery, sanitizeSearchQuery, detectAndValidateQueryType } from '../utils/validation'
import { useDebouncedCallback } from '../hooks/useDebounce'
import { useMessageHandler } from '../hooks/useMessageHandler'
import { logger } from '../utils/logger'
import logo from '../assets/logo.png'
import './App.css'

function App() {
  const [authStatus, setAuthStatus] = useState({
    hubspot: false,
    dwolla: false,
    isFullyAuthenticated: false,
    requiresReauth: [] as string[]
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [partialResults, setPartialResults] = useState<{
    hubspot?: any
    dwolla?: any
    hubspotError?: string
    dwollaError?: string
  } | null>(null)
  const [searchResults, setSearchResults] = useState<CorrelatedSearchResults | null>(null)
  const [loadingTransfers, setLoadingTransfers] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showSearchHistory, setShowSearchHistory] = useState(false)
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null)
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('')
  
  // Show debug toggle in development mode
  const isDev = import.meta.env?.DEV || false
  
  // Memoized correlated data
  const correlatedData = useMemo(() => 
    searchResults?.correlatedData || [],
    [searchResults?.correlatedData]
  )
  
  // Use message handler with cancellation support
  const { sendMessage, cancel } = useMessageHandler()

  const checkAuth = useCallback(async () => {
    try {
      const status = await checkAuthStatus()
      setAuthStatus(status)
      
      // Validate token permissions if authenticated
      if (status.isFullyAuthenticated) {
        const [hubspotPerms, dwollaPerms] = await Promise.all([
          validateTokenPermissions('hubspot'),
          validateTokenPermissions('dwolla')
        ])
        
        if (!hubspotPerms.valid || !dwollaPerms.valid) {
          logger.warn('Token permissions invalid', {
            hubspot: hubspotPerms,
            dwolla: dwollaPerms
          })
          setError('Some permissions are missing. Please re-authenticate.')
        }
      }
    } catch (err) {
      logger.error('Error checking auth status', err as Error)
      setError('Failed to check authentication status')
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Debounced search handler
  const [handleDebouncedSearch] = useDebouncedCallback(async (query: string) => {
    // Validate search query
    const validation = validateSearchQuery(query)
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid search query')
      return
    }
    
    // Clear validation error
    setValidationError(null)
    
    // Sanitize and detect query type
    const sanitized = sanitizeSearchQuery(query)
    const queryType = detectAndValidateQueryType(sanitized)
    
    if (!queryType.isValid) {
      setValidationError(queryType.error || 'Invalid query format')
      return
    }
    
    setLoading(true)
    setError(null)
    setSearchResults(null)
    setSearchStartTime(Date.now())
    setLastSearchQuery(sanitized)
    
    try {
      logger.info('Performing search', { query: sanitized, type: queryType.type })
      
      const response = await sendMessage<any>({
        type: 'SEARCH_CUSTOMER',
        query: sanitized,
        queryType: queryType.type
      }, { timeout: 30000 })
      
      if (response.error) {
        setError(response.error)
        logger.error('Search failed', new Error(response.error))
      } else if (response.success) {
        setSearchResults({
          correlatedData: response.correlatedData,
          summary: response.summary
        })
        
        // Add to search history
        if (searchStartTime) {
          const searchDuration = Date.now() - searchStartTime
          await searchHistoryService.addSearch({
            query: sanitized,
            queryType: queryType.type as any,
            resultCount: response.summary?.totalResults || 0,
            linkedAccounts: response.summary?.linkedAccounts || 0,
            searchDuration
          })
        }
        
        logger.info('Search completed', { 
          totalResults: response.summary?.totalResults || 0,
          linkedAccounts: response.summary?.linkedAccounts || 0,
          unlinkedHubSpot: response.summary?.unlinkedHubSpot || 0,
          unlinkedDwolla: response.summary?.unlinkedDwolla || 0
        })
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to search')
      const { type, friendlyMessage } = categorizeError(error)
      
      setError(friendlyMessage)
      setPartialResults(null)
      
      logger.error('Search error', error, { 
        errorType: type,
        friendlyMessage,
        query: sanitized 
      })
    } finally {
      setLoading(false)
    }
  }, 500)
  
  // Handle search form submission
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    handleDebouncedSearch(searchQuery.trim())
  }, [searchQuery, handleDebouncedSearch])
  
  // Handle search input change
  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    
    // Trigger debounced search if query is valid
    if (value.trim().length >= 2) {
      handleDebouncedSearch(value.trim())
    }
  }, [handleDebouncedSearch])
  
  // Handle search history selection
  const handleSearchHistorySelect = useCallback((query: string) => {
    setSearchQuery(query)
    handleDebouncedSearch(query)
  }, [handleDebouncedSearch])
  
  // Retry last search
  const handleRetrySearch = useCallback(() => {
    if (lastSearchQuery) {
      setError(null)
      setPartialResults(null)
      handleDebouncedSearch(lastSearchQuery)
    }
  }, [lastSearchQuery, handleDebouncedSearch])
  
  // Categorize errors for better user messaging
  const categorizeError = useCallback((error: Error): { type: 'auth' | 'network' | 'timeout' | 'config' | 'unknown', friendlyMessage: string } => {
    const message = error.message.toLowerCase()
    
    if (message.includes('not authenticated') || message.includes('authentication')) {
      return {
        type: 'auth',
        friendlyMessage: 'Authentication expired. Please reconnect to HubSpot and Dwolla.'
      }
    }
    
    if (message.includes('timeout') || message.includes('cancelled')) {
      return {
        type: 'timeout',
        friendlyMessage: 'Request timed out. The search is taking longer than expected.'
      }
    }
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return {
        type: 'network',
        friendlyMessage: 'Network connection issue. Please check your internet connection.'
      }
    }
    
    if (message.includes('client id not configured') || message.includes('configuration')) {
      return {
        type: 'config',
        friendlyMessage: 'Extension configuration error. Please contact your administrator.'
      }
    }
    
    return {
      type: 'unknown',
      friendlyMessage: error.message
    }
  }, [])
  
  // Handle keyboard shortcuts for search history
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search history
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearchHistory(true)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelectCustomer = useCallback(async (customerId: string) => {
    setLoadingTransfers(true)
    try {
      logger.info('Loading transfers for customer', { customerId })
      
      const response = await sendMessage<any>({
        type: 'GET_TRANSFERS',
        customerId
      }, { timeout: 20000 })

      if (response.success && searchResults) {
        // Update the specific customer's transfers in correlated data
        const updatedData = searchResults.correlatedData.map(customerData => {
          if (customerData.dwolla.customer?.id === customerId) {
            return {
              ...customerData,
              dwolla: {
                ...customerData.dwolla,
                transfers: response.transfers
              }
            }
          }
          return customerData
        })
        
        setSearchResults({
          ...searchResults,
          correlatedData: updatedData
        })
        logger.info('Transfers loaded', { count: response.transfers?.length || 0 })
      }
    } catch (err) {
      logger.error('Failed to load transfers', err as Error)
      setError('Failed to load transfer history')
    } finally {
      setLoadingTransfers(false)
    }
  }, [sendMessage, searchResults])

  const handleAuth = useCallback(async (provider: 'hubspot' | 'dwolla') => {
    try {
      logger.info('Starting authentication', { provider })
      
      const response = await sendMessage<any>({
        type: 'AUTHENTICATE',
        provider
      }, { timeout: 60000 }) // 60 second timeout for auth

      if (response.success) {
        logger.info('Authentication successful', { provider })
        await checkAuth()
      } else {
        const errorMsg = `Failed to authenticate with ${provider}`
        setError(errorMsg)
        logger.error('Authentication failed', new Error(errorMsg), { provider })
      }
    } catch (err) {
      const errorMsg = `Authentication error: ${err instanceof Error ? err.message : 'Unknown error'}`
      setError(errorMsg)
      logger.error('Authentication error', err as Error, { provider })
    }
  }, [sendMessage])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel() // Cancel any pending requests
    }
  }, [cancel])
  
  if (!authStatus.isFullyAuthenticated) {
    return (
      <div className="auth-container">
        <img src={logo} alt="Company Logo" className="auth-logo" />
        <h1>Unified Customer Dashboard</h1>
        <p>Please authenticate with both services to continue:</p>
        <div className="auth-buttons">
          <button 
            onClick={() => handleAuth('hubspot')} 
            className={`auth-button hubspot ${authStatus.hubspot ? 'authenticated' : ''}`}
            disabled={authStatus.hubspot}
          >
            {authStatus.hubspot ? '✓ HubSpot Connected' : 'Connect HubSpot'}
          </button>
          <button 
            onClick={() => handleAuth('dwolla')} 
            className={`auth-button dwolla ${authStatus.dwolla ? 'authenticated' : ''}`}
            disabled={authStatus.dwolla}
          >
            {authStatus.dwolla ? '✓ Dwolla Connected' : 'Connect Dwolla'}
          </button>
        </div>
        {authStatus.requiresReauth.length > 0 && (
          <div className="warning">
            Re-authentication required for: {authStatus.requiresReauth.join(', ')}
          </div>
        )}
        {error && (
          <ErrorDisplay 
            error={error}
            onRetry={handleRetrySearch}
            onDismiss={() => setError(null)}
            retryLabel="Try Again"
          />
        )}
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <Header 
          title="Customer Dashboard"
          showDebugToggle={isDev}
          onDebugToggle={() => setShowDebug(!showDebug)}
          showDebug={showDebug}
        />
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Search by email, name, or business name... (⌘K for history)"
              value={searchQuery}
              onChange={handleSearchInputChange}
              className="search-input"
              disabled={loading}
              aria-label="Search customers by email, name, or business name"
              aria-invalid={!!validationError}
              aria-describedby={validationError ? 'search-error' : (searchResults ? 'search-results' : undefined)}
              autoComplete="off"
              spellCheck="false"
            />
            <button
              type="button"
              className="search-history-button"
              onClick={() => setShowSearchHistory(true)}
              aria-label="Show search history"
              title="Search History (⌘K)"
            >
              🕐
            </button>
          </div>
          <button 
            type="submit" 
            disabled={loading || !searchQuery.trim() || !!validationError} 
            className="search-button"
            aria-label={loading ? 'Searching' : 'Search'}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        {validationError && (
          <div id="search-error" className="validation-error" role="alert">
            {validationError}
          </div>
        )}
      </header>

      {error && (
        <ErrorDisplay 
          error={error}
          onRetry={handleRetrySearch}
          onDismiss={() => setError(null)}
          retryLabel="Retry Search"
        />
      )}

      <main className="main-content">
        {loading ? (
          <div className="loading-skeletons" aria-label="Loading search results">
            <SkeletonCorrelatedData />
            <SkeletonCorrelatedData />
            <SkeletonCorrelatedData />
          </div>
        ) : correlatedData.length > 0 ? (
          <div 
            className="correlated-results"
            id="search-results"
            role="region"
            aria-label={`Search results: ${correlatedData.length} customer${correlatedData.length !== 1 ? 's' : ''} found`}
          >
            {correlatedData.map((customerData, index) => (
              <CorrelatedDataView
                key={`${customerData.hubspot.company?.id || 'no-company'}-${customerData.dwolla.customer?.id || 'no-customer'}-${index}`}
                data={customerData}
                onSelectCustomer={handleSelectCustomer}
                loading={loadingTransfers}
              />
            ))}
          </div>
        ) : (
          searchResults && (
            <div className="no-results" role="status" aria-live="polite">
              <div className="no-results-icon">🔍</div>
              <h3>No customers found</h3>
              <p>No matching records found for "<strong>{lastSearchQuery}</strong>"</p>
              
              <div className="no-results-suggestions">
                <h4>Search suggestions:</h4>
                <ul>
                  <li>Try searching with just the first or last name</li>
                  <li>Check the email address spelling</li>
                  <li>Search using the business name instead</li>
                  <li>Make sure you're connected to both HubSpot and Dwolla</li>
                </ul>
              </div>
              
              <div className="no-results-actions">
                <button 
                  className="suggestion-button"
                  onClick={() => setShowSearchHistory(true)}
                  type="button"
                >
                  📋 View Recent Searches
                </button>
                {lastSearchQuery.includes('@') && (
                  <button 
                    className="suggestion-button"
                    onClick={() => {
                      const namePart = lastSearchQuery.split('@')[0]
                      setSearchQuery(namePart)
                      handleDebouncedSearch(namePart)
                    }}
                    type="button"
                  >
                    👤 Try searching by name: "{lastSearchQuery.split('@')[0]}"
                  </button>
                )}
                {lastSearchQuery.length > 10 && (
                  <button 
                    className="suggestion-button"
                    onClick={() => {
                      const shortQuery = lastSearchQuery.split(' ')[0]
                      setSearchQuery(shortQuery)
                      handleDebouncedSearch(shortQuery)
                    }}
                    type="button"
                  >
                    🔍 Try shorter search: "{lastSearchQuery.split(' ')[0]}"
                  </button>
                )}
              </div>
            </div>
          )
        )}
        
        {searchResults?.summary && (
          <div 
            className="search-summary"
            role="status"
            aria-label={`Search summary: ${searchResults.summary.totalResults} total results, ${searchResults.summary.linkedAccounts} linked accounts${searchResults.summary.inconsistencyCount > 0 ? `, ${searchResults.summary.inconsistencyCount} data issues` : ''}`}
          >
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-number" aria-label={`${searchResults.summary.totalResults} total results`}>
                  {searchResults.summary.totalResults}
                </span>
                <span className="stat-label">Total Results</span>
              </div>
              <div className="stat">
                <span className="stat-number" aria-label={`${searchResults.summary.linkedAccounts} linked accounts`}>
                  {searchResults.summary.linkedAccounts}
                </span>
                <span className="stat-label">Linked Accounts</span>
              </div>
              {searchResults.summary.inconsistencyCount > 0 && (
                <div className="stat warning">
                  <span className="stat-number" aria-label={`${searchResults.summary.inconsistencyCount} data issues requiring attention`}>
                    {searchResults.summary.inconsistencyCount}
                  </span>
                  <span className="stat-label">Data Issues</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <DebugPanel show={showDebug} onClose={() => setShowDebug(false)} />
      
      <SearchHistory
        isVisible={showSearchHistory}
        onClose={() => setShowSearchHistory(false)}
        onSelectSearch={handleSearchHistorySelect}
        currentQuery={searchQuery}
      />
    </div>
  )
}

export default App