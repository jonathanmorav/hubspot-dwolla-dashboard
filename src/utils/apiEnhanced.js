// Enhanced API client with logging, retry logic, and caching
import { logger, generateRequestId } from './logger';
import { rateLimiter, RateLimitError } from './rateLimiter';
import { getAccessToken } from './auth';
export class ApiError extends Error {
    constructor(message, status, code, provider) {
        super(message);
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: status
        });
        Object.defineProperty(this, "code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: code
        });
        Object.defineProperty(this, "provider", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: provider
        });
        this.name = 'ApiError';
    }
}
// Simple in-memory cache
export class ApiCache {
    constructor() {
        Object.defineProperty(this, "cache", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "defaultTTL", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 5 * 60 * 1000
        }); // 5 minutes
    }
    set(key, data, ttl) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL
        });
        logger.debug('Cache set', { key, ttl: ttl || this.defaultTTL });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            logger.debug('Cache expired', { key });
            return null;
        }
        logger.debug('Cache hit', { key });
        return entry.data;
    }
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        logger.info('Cache cleared', { entriesCleared: size });
    }
    getCacheKey(url, options) {
        const method = options?.method || 'GET';
        const body = options?.body ? JSON.stringify(options.body) : '';
        return `${method}:${url}:${body}`;
    }
}
// Enhanced API Client
export class EnhancedApiClient {
    constructor(config) {
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "cache", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "requestQueue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        this.config = {
            maxRetries: 3,
            retryDelay: 1000,
            timeout: 10000,
            cache: true,
            cacheTTL: 5 * 60 * 1000,
            ...config
        };
        this.cache = new ApiCache();
    }
    async request(endpoint, options = {}) {
        const requestId = generateRequestId();
        const url = `${this.config.baseUrl}${endpoint}`;
        const timer = logger.startTimer('api_request');
        // Check cache first
        if (this.config.cache && !options.skipCache && options.method === 'GET') {
            const cacheKey = this.cache.getCacheKey(url, options);
            const cached = this.cache.get(cacheKey);
            if (cached) {
                logger.info('API request served from cache', {
                    requestId,
                    endpoint,
                    provider: this.config.provider,
                    cached: true
                });
                return cached;
            }
        }
        // Deduplicate concurrent requests
        const dedupeKey = this.cache.getCacheKey(url, options);
        if (this.requestQueue.has(dedupeKey)) {
            logger.debug('Request deduplicated', {
                requestId,
                endpoint,
                provider: this.config.provider
            });
            return this.requestQueue.get(dedupeKey);
        }
        // Create request promise
        const requestPromise = this.executeRequest(url, endpoint, options, requestId, timer);
        // Store in queue
        this.requestQueue.set(dedupeKey, requestPromise);
        try {
            const result = await requestPromise;
            return result;
        }
        finally {
            // Remove from queue
            this.requestQueue.delete(dedupeKey);
        }
    }
    async executeRequest(url, endpoint, options, requestId, timer) {
        try {
            // Check rate limit
            if (!options.skipRateLimit) {
                await rateLimiter.checkLimit(this.config.provider);
            }
            // Get fresh access token
            const token = await getAccessToken(this.config.provider);
            if (!token) {
                throw new ApiError('No access token available', 401, 'NO_TOKEN', this.config.provider);
            }
            // Make request with retry logic
            const response = await this.executeWithRetry(url, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            }, requestId, options.retryCount || 0);
            const duration = timer.end();
            // Parse response
            const data = await this.parseResponse(response);
            // Log success
            logger.info('API request completed', {
                requestId,
                endpoint,
                method: options.method || 'GET',
                status: response.status,
                duration: Math.round(duration),
                provider: this.config.provider
            });
            // Log performance
            await logger.logPerformance('api_request', duration, {
                endpoint,
                provider: this.config.provider,
                status: response.status
            });
            // Cache successful GET requests
            if (this.config.cache && options.method === 'GET' && response.ok) {
                const cacheKey = this.cache.getCacheKey(url, options);
                this.cache.set(cacheKey, data, this.config.cacheTTL);
            }
            return data;
        }
        catch (error) {
            const duration = timer.end();
            // Enhanced error logging
            logger.error('API request failed', error, {
                requestId,
                endpoint,
                method: options.method || 'GET',
                provider: this.config.provider,
                duration: Math.round(duration),
                errorType: error instanceof RateLimitError ? 'rate_limit' : 'api_error'
            });
            throw error;
        }
    }
    async executeWithRetry(url, options, requestId, retryCount) {
        try {
            // Add timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            // Check if we should retry
            if (!response.ok && this.shouldRetry(response.status, retryCount)) {
                throw new ApiError(`API returned ${response.status}`, response.status, undefined, this.config.provider);
            }
            return response;
        }
        catch (error) {
            // Handle network errors and timeouts
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new ApiError('Request timeout', 408, 'TIMEOUT', this.config.provider);
                }
                // Retry logic
                if (retryCount < this.config.maxRetries) {
                    const delay = this.getRetryDelay(retryCount);
                    logger.warn('Retrying API request', {
                        requestId,
                        url,
                        retryCount: retryCount + 1,
                        maxRetries: this.config.maxRetries,
                        delay,
                        error: error.message
                    });
                    await this.sleep(delay);
                    return this.executeWithRetry(url, options, requestId, retryCount + 1);
                }
            }
            throw error;
        }
    }
    shouldRetry(status, retryCount) {
        // Don't retry if we've exhausted retries
        if (retryCount >= this.config.maxRetries) {
            return false;
        }
        // Retry on specific status codes
        const retryableStatuses = [429, 500, 502, 503, 504];
        return retryableStatuses.includes(status);
    }
    getRetryDelay(retryCount) {
        // Exponential backoff with jitter
        const baseDelay = this.config.retryDelay;
        const exponentialDelay = baseDelay * Math.pow(2, retryCount);
        const jitter = Math.random() * 1000;
        return exponentialDelay + jitter;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async parseResponse(response) {
        const contentType = response.headers.get('content-type');
        if (!response.ok) {
            let errorBody;
            try {
                errorBody = contentType?.includes('application/json')
                    ? await response.json()
                    : await response.text();
            }
            catch {
                errorBody = 'Failed to parse error response';
            }
            throw new ApiError(errorBody.message || errorBody.error || `API error: ${response.status}`, response.status, errorBody.code, this.config.provider);
        }
        if (contentType?.includes('application/json')) {
            return response.json();
        }
        // Return text for non-JSON responses
        return response.text();
    }
    // Clear cache
    clearCache() {
        this.cache.clear();
    }
    // Get cache stats
    getCacheStats() {
        return {
            size: this.cache.cache.size
        };
    }
}
// Enhanced HubSpot Client
export class EnhancedHubSpotClient extends EnhancedApiClient {
    constructor() {
        super({
            baseUrl: 'https://api.hubapi.com',
            provider: 'hubspot'
        });
    }
    async searchContacts(email) {
        const searchRequest = {
            filterGroups: [{
                    filters: [{
                            propertyName: 'email',
                            operator: 'EQ',
                            value: email
                        }]
                }],
            properties: ['firstname', 'lastname', 'email', 'phone', 'company']
        };
        return this.request('/crm/v3/objects/contacts/search', {
            method: 'POST',
            body: JSON.stringify(searchRequest)
        });
    }
    async searchCompanies(query) {
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
        };
        return this.request('/crm/v3/objects/companies/search', {
            method: 'POST',
            body: JSON.stringify(searchRequest)
        });
    }
    async searchByName(name) {
        // Search both contacts and companies by name
        const [contacts, companies] = await Promise.allSettled([
            this.searchContactsByName(name),
            this.searchCompanies(name)
        ]);
        return {
            contacts: contacts.status === 'fulfilled' ? contacts.value.results : [],
            companies: companies.status === 'fulfilled' ? companies.value.results : []
        };
    }
    async searchContactsByName(name) {
        const nameParts = name.split(' ');
        const filters = [];
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
            });
        }
        else {
            // Search in both first and last name
            filters.push({
                propertyName: 'firstname',
                operator: 'CONTAINS_TOKEN',
                value: name
            });
        }
        const searchRequest = {
            filterGroups: [{ filters }],
            properties: ['firstname', 'lastname', 'email', 'phone', 'company'],
            limit: 100
        };
        return this.request('/crm/v3/objects/contacts/search', {
            method: 'POST',
            body: JSON.stringify(searchRequest)
        });
    }
}
// Enhanced Dwolla Client
export class EnhancedDwollaClient extends EnhancedApiClient {
    constructor() {
        const environment = import.meta.env?.VITE_DWOLLA_ENVIRONMENT || 'sandbox';
        super({
            baseUrl: environment === 'production'
                ? 'https://api.dwolla.com'
                : 'https://api-sandbox.dwolla.com',
            provider: 'dwolla'
        });
    }
    async searchCustomers(email) {
        return this.request(`/customers?email=${encodeURIComponent(email)}&limit=100`);
    }
    async searchCustomersByName(name) {
        // Dwolla doesn't have direct name search, so we'll need to filter results
        const allCustomers = await this.request('/customers?limit=200');
        if (!allCustomers._embedded?.customers) {
            return { _embedded: { customers: [] } };
        }
        const nameLower = name.toLowerCase();
        const filtered = allCustomers._embedded.customers.filter((customer) => {
            const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
            const businessName = customer.businessName?.toLowerCase() || '';
            return fullName.includes(nameLower) || businessName.includes(nameLower);
        });
        return { _embedded: { customers: filtered } };
    }
    async getCustomerTransfers(customerId, limit = 50) {
        return this.request(`/customers/${customerId}/transfers?limit=${limit}`);
    }
    async getTransferById(id) {
        return this.request(`/transfers/${id}`);
    }
}
