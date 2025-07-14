import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { CorrelatedDataView } from '../components/CorrelatedDataView';
import { SearchHistory } from '../components/SearchHistory';
import { DebugPanel } from '../components/DebugPanel';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { Header } from '../components/Header';
import { SkeletonCorrelatedData } from '../components/Skeleton';
import { searchHistoryService } from '../utils/searchHistory';
import { checkAuthStatus, validateTokenPermissions } from '../utils/auth';
import { validateSearchQuery, sanitizeSearchQuery, detectAndValidateQueryType } from '../utils/validation';
import { useDebouncedCallback } from '../hooks/useDebounce';
import { useMessageHandler } from '../hooks/useMessageHandler';
import { logger } from '../utils/logger';
import logo from '../assets/logo.png';
import './App.css';
function App() {
    const [authStatus, setAuthStatus] = useState({
        hubspot: false,
        dwolla: false,
        isFullyAuthenticated: false,
        requiresReauth: []
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [partialResults, setPartialResults] = useState(null);
    const [searchResults, setSearchResults] = useState(null);
    const [loadingTransfers, setLoadingTransfers] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const [validationError, setValidationError] = useState(null);
    const [showSearchHistory, setShowSearchHistory] = useState(false);
    const [searchStartTime, setSearchStartTime] = useState(null);
    const [lastSearchQuery, setLastSearchQuery] = useState('');
    // Show debug toggle in development mode
    const isDev = import.meta.env?.DEV || false;
    // Memoized correlated data
    const correlatedData = useMemo(() => searchResults?.correlatedData || [], [searchResults?.correlatedData]);
    // Use message handler with cancellation support
    const { sendMessage, cancel } = useMessageHandler();
    const checkAuth = useCallback(async () => {
        try {
            const status = await checkAuthStatus();
            setAuthStatus(status);
            // Validate token permissions if authenticated
            if (status.isFullyAuthenticated) {
                const [hubspotPerms, dwollaPerms] = await Promise.all([
                    validateTokenPermissions('hubspot'),
                    validateTokenPermissions('dwolla')
                ]);
                if (!hubspotPerms.valid || !dwollaPerms.valid) {
                    logger.warn('Token permissions invalid', {
                        hubspot: hubspotPerms,
                        dwolla: dwollaPerms
                    });
                    setError('Some permissions are missing. Please re-authenticate.');
                }
            }
        }
        catch (err) {
            logger.error('Error checking auth status', err);
            setError('Failed to check authentication status');
        }
    }, []);
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);
    // Debounced search handler
    const [handleDebouncedSearch] = useDebouncedCallback(async (query) => {
        // Validate search query
        const validation = validateSearchQuery(query);
        if (!validation.isValid) {
            setValidationError(validation.error || 'Invalid search query');
            return;
        }
        // Clear validation error
        setValidationError(null);
        // Sanitize and detect query type
        const sanitized = sanitizeSearchQuery(query);
        const queryType = detectAndValidateQueryType(sanitized);
        if (!queryType.isValid) {
            setValidationError(queryType.error || 'Invalid query format');
            return;
        }
        setLoading(true);
        setError(null);
        setSearchResults(null);
        setSearchStartTime(Date.now());
        setLastSearchQuery(sanitized);
        try {
            logger.info('Performing search', { query: sanitized, type: queryType.type });
            const response = await sendMessage({
                type: 'SEARCH_CUSTOMER',
                query: sanitized,
                queryType: queryType.type
            }, { timeout: 30000 });
            if (response.error) {
                setError(response.error);
                logger.error('Search failed', new Error(response.error));
            }
            else if (response.success) {
                setSearchResults({
                    correlatedData: response.correlatedData,
                    summary: response.summary
                });
                // Add to search history
                if (searchStartTime) {
                    const searchDuration = Date.now() - searchStartTime;
                    await searchHistoryService.addSearch({
                        query: sanitized,
                        queryType: queryType.type,
                        resultCount: response.summary?.totalResults || 0,
                        linkedAccounts: response.summary?.linkedAccounts || 0,
                        searchDuration
                    });
                }
                logger.info('Search completed', {
                    totalResults: response.summary?.totalResults || 0,
                    linkedAccounts: response.summary?.linkedAccounts || 0,
                    unlinkedHubSpot: response.summary?.unlinkedHubSpot || 0,
                    unlinkedDwolla: response.summary?.unlinkedDwolla || 0
                });
            }
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to search');
            const { type, friendlyMessage } = categorizeError(error);
            setError(friendlyMessage);
            setPartialResults(null);
            logger.error('Search error', error, {
                errorType: type,
                friendlyMessage,
                query: sanitized
            });
        }
        finally {
            setLoading(false);
        }
    }, 500);
    // Handle search form submission
    const handleSearch = useCallback((e) => {
        e.preventDefault();
        if (!searchQuery.trim())
            return;
        handleDebouncedSearch(searchQuery.trim());
    }, [searchQuery, handleDebouncedSearch]);
    // Handle search input change
    const handleSearchInputChange = useCallback((e) => {
        const value = e.target.value;
        setSearchQuery(value);
        // Trigger debounced search if query is valid
        if (value.trim().length >= 2) {
            handleDebouncedSearch(value.trim());
        }
    }, [handleDebouncedSearch]);
    // Handle search history selection
    const handleSearchHistorySelect = useCallback((query) => {
        setSearchQuery(query);
        handleDebouncedSearch(query);
    }, [handleDebouncedSearch]);
    // Retry last search
    const handleRetrySearch = useCallback(() => {
        if (lastSearchQuery) {
            setError(null);
            setPartialResults(null);
            handleDebouncedSearch(lastSearchQuery);
        }
    }, [lastSearchQuery, handleDebouncedSearch]);
    // Categorize errors for better user messaging
    const categorizeError = useCallback((error) => {
        const message = error.message.toLowerCase();
        if (message.includes('not authenticated') || message.includes('authentication')) {
            return {
                type: 'auth',
                friendlyMessage: 'Authentication expired. Please reconnect to HubSpot and Dwolla.'
            };
        }
        if (message.includes('timeout') || message.includes('cancelled')) {
            return {
                type: 'timeout',
                friendlyMessage: 'Request timed out. The search is taking longer than expected.'
            };
        }
        if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
            return {
                type: 'network',
                friendlyMessage: 'Network connection issue. Please check your internet connection.'
            };
        }
        if (message.includes('client id not configured') || message.includes('configuration')) {
            return {
                type: 'config',
                friendlyMessage: 'Extension configuration error. Please contact your administrator.'
            };
        }
        return {
            type: 'unknown',
            friendlyMessage: error.message
        };
    }, []);
    // Handle keyboard shortcuts for search history
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Cmd/Ctrl + K to open search history
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearchHistory(true);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);
    const handleSelectCustomer = useCallback(async (customerId) => {
        setLoadingTransfers(true);
        try {
            logger.info('Loading transfers for customer', { customerId });
            const response = await sendMessage({
                type: 'GET_TRANSFERS',
                customerId
            }, { timeout: 20000 });
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
                        };
                    }
                    return customerData;
                });
                setSearchResults({
                    ...searchResults,
                    correlatedData: updatedData
                });
                logger.info('Transfers loaded', { count: response.transfers?.length || 0 });
            }
        }
        catch (err) {
            logger.error('Failed to load transfers', err);
            setError('Failed to load transfer history');
        }
        finally {
            setLoadingTransfers(false);
        }
    }, [sendMessage, searchResults]);
    const handleAuth = useCallback(async (provider) => {
        try {
            logger.info('Starting authentication', { provider });
            const response = await sendMessage({
                type: 'AUTHENTICATE',
                provider
            }, { timeout: 60000 }); // 60 second timeout for auth
            if (response.success) {
                logger.info('Authentication successful', { provider });
                await checkAuth();
            }
            else {
                const errorMsg = `Failed to authenticate with ${provider}`;
                setError(errorMsg);
                logger.error('Authentication failed', new Error(errorMsg), { provider });
            }
        }
        catch (err) {
            const errorMsg = `Authentication error: ${err instanceof Error ? err.message : 'Unknown error'}`;
            setError(errorMsg);
            logger.error('Authentication error', err, { provider });
        }
    }, [sendMessage]);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancel(); // Cancel any pending requests
        };
    }, [cancel]);
    if (!authStatus.isFullyAuthenticated) {
        return (_jsxs("div", { className: "auth-container", children: [_jsx("img", { src: logo, alt: "Company Logo", className: "auth-logo" }), _jsx("h1", { children: "Unified Customer Dashboard" }), _jsx("p", { children: "Please authenticate with both services to continue:" }), _jsxs("div", { className: "auth-buttons", children: [_jsx("button", { onClick: () => handleAuth('hubspot'), className: `auth-button hubspot ${authStatus.hubspot ? 'authenticated' : ''}`, disabled: authStatus.hubspot, children: authStatus.hubspot ? '✓ HubSpot Connected' : 'Connect HubSpot' }), _jsx("button", { onClick: () => handleAuth('dwolla'), className: `auth-button dwolla ${authStatus.dwolla ? 'authenticated' : ''}`, disabled: authStatus.dwolla, children: authStatus.dwolla ? '✓ Dwolla Connected' : 'Connect Dwolla' })] }), authStatus.requiresReauth.length > 0 && (_jsxs("div", { className: "warning", children: ["Re-authentication required for: ", authStatus.requiresReauth.join(', ')] })), error && (_jsx(ErrorDisplay, { error: error, onRetry: handleRetrySearch, onDismiss: () => setError(null), retryLabel: "Try Again" }))] }));
    }
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "header", children: [_jsx(Header, { title: "Customer Dashboard", showDebugToggle: isDev, onDebugToggle: () => setShowDebug(!showDebug), showDebug: showDebug }), _jsxs("form", { onSubmit: handleSearch, className: "search-form", children: [_jsxs("div", { className: "search-input-container", children: [_jsx("input", { type: "text", placeholder: "Search by email, name, or business name... (\u2318K for history)", value: searchQuery, onChange: handleSearchInputChange, className: "search-input", disabled: loading, "aria-label": "Search customers by email, name, or business name", "aria-invalid": !!validationError, "aria-describedby": validationError ? 'search-error' : (searchResults ? 'search-results' : undefined), autoComplete: "off", spellCheck: "false" }), _jsx("button", { type: "button", className: "search-history-button", onClick: () => setShowSearchHistory(true), "aria-label": "Show search history", title: "Search History (\u2318K)", children: "\uD83D\uDD50" })] }), _jsx("button", { type: "submit", disabled: loading || !searchQuery.trim() || !!validationError, className: "search-button", "aria-label": loading ? 'Searching' : 'Search', children: loading ? 'Searching...' : 'Search' })] }), validationError && (_jsx("div", { id: "search-error", className: "validation-error", role: "alert", children: validationError }))] }), error && (_jsx(ErrorDisplay, { error: error, onRetry: handleRetrySearch, onDismiss: () => setError(null), retryLabel: "Retry Search" })), _jsxs("main", { className: "main-content", children: [loading ? (_jsxs("div", { className: "loading-skeletons", "aria-label": "Loading search results", children: [_jsx(SkeletonCorrelatedData, {}), _jsx(SkeletonCorrelatedData, {}), _jsx(SkeletonCorrelatedData, {})] })) : correlatedData.length > 0 ? (_jsx("div", { className: "correlated-results", id: "search-results", role: "region", "aria-label": `Search results: ${correlatedData.length} customer${correlatedData.length !== 1 ? 's' : ''} found`, children: correlatedData.map((customerData, index) => (_jsx(CorrelatedDataView, { data: customerData, onSelectCustomer: handleSelectCustomer, loading: loadingTransfers }, `${customerData.hubspot.company?.id || 'no-company'}-${customerData.dwolla.customer?.id || 'no-customer'}-${index}`))) })) : (searchResults && (_jsxs("div", { className: "no-results", role: "status", "aria-live": "polite", children: [_jsx("div", { className: "no-results-icon", children: "\uD83D\uDD0D" }), _jsx("h3", { children: "No customers found" }), _jsxs("p", { children: ["No matching records found for \"", _jsx("strong", { children: lastSearchQuery }), "\""] }), _jsxs("div", { className: "no-results-suggestions", children: [_jsx("h4", { children: "Search suggestions:" }), _jsxs("ul", { children: [_jsx("li", { children: "Try searching with just the first or last name" }), _jsx("li", { children: "Check the email address spelling" }), _jsx("li", { children: "Search using the business name instead" }), _jsx("li", { children: "Make sure you're connected to both HubSpot and Dwolla" })] })] }), _jsxs("div", { className: "no-results-actions", children: [_jsx("button", { className: "suggestion-button", onClick: () => setShowSearchHistory(true), type: "button", children: "\uD83D\uDCCB View Recent Searches" }), lastSearchQuery.includes('@') && (_jsxs("button", { className: "suggestion-button", onClick: () => {
                                            const namePart = lastSearchQuery.split('@')[0];
                                            setSearchQuery(namePart);
                                            handleDebouncedSearch(namePart);
                                        }, type: "button", children: ["\uD83D\uDC64 Try searching by name: \"", lastSearchQuery.split('@')[0], "\""] })), lastSearchQuery.length > 10 && (_jsxs("button", { className: "suggestion-button", onClick: () => {
                                            const shortQuery = lastSearchQuery.split(' ')[0];
                                            setSearchQuery(shortQuery);
                                            handleDebouncedSearch(shortQuery);
                                        }, type: "button", children: ["\uD83D\uDD0D Try shorter search: \"", lastSearchQuery.split(' ')[0], "\""] }))] })] }))), searchResults?.summary && (_jsx("div", { className: "search-summary", role: "status", "aria-label": `Search summary: ${searchResults.summary.totalResults} total results, ${searchResults.summary.linkedAccounts} linked accounts${searchResults.summary.inconsistencyCount > 0 ? `, ${searchResults.summary.inconsistencyCount} data issues` : ''}`, children: _jsxs("div", { className: "summary-stats", children: [_jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-number", "aria-label": `${searchResults.summary.totalResults} total results`, children: searchResults.summary.totalResults }), _jsx("span", { className: "stat-label", children: "Total Results" })] }), _jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-number", "aria-label": `${searchResults.summary.linkedAccounts} linked accounts`, children: searchResults.summary.linkedAccounts }), _jsx("span", { className: "stat-label", children: "Linked Accounts" })] }), searchResults.summary.inconsistencyCount > 0 && (_jsxs("div", { className: "stat warning", children: [_jsx("span", { className: "stat-number", "aria-label": `${searchResults.summary.inconsistencyCount} data issues requiring attention`, children: searchResults.summary.inconsistencyCount }), _jsx("span", { className: "stat-label", children: "Data Issues" })] }))] }) }))] }), _jsx(DebugPanel, { show: showDebug, onClose: () => setShowDebug(false) }), _jsx(SearchHistory, { isVisible: showSearchHistory, onClose: () => setShowSearchHistory(false), onSelectSearch: handleSearchHistorySelect, currentQuery: searchQuery })] }));
}
export default App;
