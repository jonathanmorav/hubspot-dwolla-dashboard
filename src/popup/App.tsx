import { useState, useEffect, useCallback, useMemo } from 'react'
import { HubSpotPanel } from '../components/HubSpotPanel'
import { DwollaPanel } from '../components/DwollaPanel'
import { DebugPanel } from '../components/DebugPanel'
import { Header } from '../components/Header'
import { SearchResults } from '../types'
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
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [loadingTransfers, setLoadingTransfers] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  
  // Show debug toggle in development mode
  const isDev = import.meta.env?.DEV || false
  
  // Memoized search results
  const hubspotData = useMemo(() => ({
    companies: searchResults?.hubspot.companies || [],
    contacts: searchResults?.hubspot.contacts || []
  }), [searchResults?.hubspot.companies, searchResults?.hubspot.contacts])
  
  const dwollaData = useMemo(() => ({
    customers: searchResults?.dwolla.customers || [],
    transfers: searchResults?.dwolla.transfers || []
  }), [searchResults?.dwolla.customers, searchResults?.dwolla.transfers])
  
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
          hubspot: response.hubspot,
          dwolla: response.dwolla
        })
        logger.info('Search completed', { 
          hubspotResults: response.hubspot?.contacts?.length || 0,
          dwollaResults: response.dwolla?.customers?.length || 0
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search'
      setError(errorMessage)
      logger.error('Search error', err as Error)
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

  const handleSelectCustomer = useCallback(async (customerId: string) => {
    setLoadingTransfers(true)
    try {
      logger.info('Loading transfers for customer', { customerId })
      
      const response = await sendMessage<any>({
        type: 'GET_TRANSFERS',
        customerId
      }, { timeout: 20000 })

      if (response.success && searchResults) {
        setSearchResults({
          ...searchResults,
          dwolla: {
            ...searchResults.dwolla,
            transfers: response.transfers
          }
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
        {error && <div className="error" role="alert">{error}</div>}
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
          <input
            type="text"
            placeholder="Search by email, name, or business name..."
            value={searchQuery}
            onChange={handleSearchInputChange}
            className="search-input"
            disabled={loading}
            aria-label="Search customers"
            aria-invalid={!!validationError}
            aria-describedby={validationError ? 'search-error' : undefined}
          />
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

      {error && <div className="error" role="alert">{error}</div>}

      <main className="main-content">
        <div className="panel-container">
          <HubSpotPanel
            companies={hubspotData.companies}
            contacts={hubspotData.contacts}
            loading={loading}
          />
          
          <DwollaPanel
            customers={dwollaData.customers}
            transfers={dwollaData.transfers}
            loading={loading || loadingTransfers}
            onSelectCustomer={handleSelectCustomer}
          />
        </div>
      </main>

      <DebugPanel show={showDebug} onClose={() => setShowDebug(false)} />
    </div>
  )
}

export default App