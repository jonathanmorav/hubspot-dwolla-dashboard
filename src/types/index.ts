// HubSpot Types
export interface HubSpotCompany {
  id: string
  properties: {
    name: string
    domain?: string
    dwolla_id?: string
    onboarding_step?: string
    onboarding_status?: string
    sob?: string
    associated_policies?: string
  }
  createdAt: string
  updatedAt: string
}

export interface HubSpotContact {
  id: string
  properties: {
    firstname?: string
    lastname?: string
    email: string
    phone?: string
    company?: string
  }
  createdAt: string
  updatedAt: string
}

// Dwolla Types
export interface DwollaCustomer {
  id: string
  firstName: string
  lastName: string
  email: string
  type: 'personal' | 'business'
  status: 'unverified' | 'suspended' | 'verified'
  created: string
  businessName?: string
}

export interface DwollaTransfer {
  id: string
  status: 'pending' | 'processed' | 'failed' | 'cancelled'
  amount: {
    value: string
    currency: 'USD'
  }
  created: string
  source: {
    id: string
    type: string
  }
  destination: {
    id: string
    type: string
  }
  fees?: Array<{
    amount: {
      value: string
      currency: 'USD'
    }
  }>
}

// Search Results
export interface SearchResults {
  hubspot: {
    companies: HubSpotCompany[]
    contacts: HubSpotContact[]
  }
  dwolla: {
    customers: DwollaCustomer[]
    transfers: DwollaTransfer[]
  }
}

// Correlated Search Results
export interface CorrelatedSearchResults {
  correlatedData: import('../utils/dataCorrelation').CorrelatedCustomerData[]
  summary: {
    totalResults: number
    linkedAccounts: number
    unlinkedHubSpot: number
    unlinkedDwolla: number
    inconsistencyCount: number
  }
}

// API Response Types
export interface HubSpotSearchResponse {
  results: HubSpotContact[] | HubSpotCompany[]
  total: number
  paging?: {
    next?: {
      after?: string
    }
  }
}

export interface HubSpotContactSearchResponse {
  results: HubSpotContact[]
  total: number
  paging?: {
    next?: {
      after?: string
    }
  }
}

export interface HubSpotCompanySearchResponse {
  results: HubSpotCompany[]
  total: number
  paging?: {
    next?: {
      after?: string
    }
  }
}

export interface DwollaCustomerSearchResponse {
  _embedded?: {
    customers: DwollaCustomer[]
  }
  total?: number
  _links?: {
    next?: {
      href: string
    }
  }
}

export interface DwollaTransferSearchResponse {
  _embedded?: {
    transfers: DwollaTransfer[]
  }
  total?: number
  _links?: {
    next?: {
      href: string
    }
  }
}

// API Error
export interface ApiError {
  message: string
  code?: string
  details?: any
}