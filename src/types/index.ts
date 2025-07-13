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

// API Error
export interface ApiError {
  message: string
  code?: string
  details?: any
}