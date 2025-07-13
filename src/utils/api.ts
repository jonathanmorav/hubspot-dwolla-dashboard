// API utility functions

const HUBSPOT_API_BASE = 'https://api.hubapi.com'

interface ApiConfig {
  token: string
  baseUrl: string
}

class ApiClient {
  private config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = config
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }))
        throw new Error(error.message || `API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }
}

// HubSpot API client
export class HubSpotClient extends ApiClient {
  constructor(token: string) {
    super({ token, baseUrl: HUBSPOT_API_BASE })
  }

  async searchContacts(email: string) {
    const searchRequest = {
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ',
          value: email
        }]
      }]
    }

    return this.request('/crm/v3/objects/contacts/search', {
      method: 'POST',
      body: JSON.stringify(searchRequest)
    })
  }

  async searchCompanies(query: string) {
    const searchRequest = {
      filterGroups: [{
        filters: [{
          propertyName: 'name',
          operator: 'CONTAINS_TOKEN',
          value: query
        }]
      }]
    }

    return this.request('/crm/v3/objects/companies/search', {
      method: 'POST',
      body: JSON.stringify(searchRequest)
    })
  }

  async getCompanyById(id: string) {
    return this.request(`/crm/v3/objects/companies/${id}?properties=name,domain,dwolla_id,onboarding_step,onboarding_status,sob,associated_policies`)
  }

  async getContactById(id: string) {
    return this.request(`/crm/v3/objects/contacts/${id}?properties=firstname,lastname,email,phone,company`)
  }
}

// Dwolla API client
export class DwollaClient extends ApiClient {
  constructor(token: string, sandbox = true) {
    const baseUrl = sandbox ? 'https://api-sandbox.dwolla.com' : 'https://api.dwolla.com'
    super({ token, baseUrl })
  }

  async searchCustomers(email: string) {
    return this.request(`/customers?email=${encodeURIComponent(email)}`)
  }

  async getCustomerById(id: string) {
    return this.request(`/customers/${id}`)
  }

  async getCustomerTransfers(customerId: string, limit = 50) {
    return this.request(`/customers/${customerId}/transfers?limit=${limit}`)
  }

  async getTransferById(id: string) {
    return this.request(`/transfers/${id}`)
  }
}

// Utility function to perform parallel searches
export async function performSearch(query: string, hubspotToken: string, dwollaToken: string) {
  const hubspot = new HubSpotClient(hubspotToken)
  const dwolla = new DwollaClient(dwollaToken)

  // Determine search type based on query
  const isEmail = query.includes('@')
  
  try {
    const results = await Promise.allSettled([
      // HubSpot searches
      isEmail ? hubspot.searchContacts(query) : Promise.resolve({ results: [] }),
      hubspot.searchCompanies(query),
      
      // Dwolla searches
      isEmail ? dwolla.searchCustomers(query) : Promise.resolve({ _embedded: { customers: [] } })
    ])

    // Process results
    const [contactsResult, companiesResult, customersResult] = results

    return {
      hubspot: {
        contacts: contactsResult.status === 'fulfilled' ? (contactsResult.value as any).results : [],
        companies: companiesResult.status === 'fulfilled' ? (companiesResult.value as any).results : []
      },
      dwolla: {
        customers: customersResult.status === 'fulfilled' ? (customersResult.value as any)._embedded?.customers || [] : [],
        transfers: [] // Will be fetched after customer is selected
      }
    }
  } catch (error) {
    console.error('Search error:', error)
    throw error
  }
}