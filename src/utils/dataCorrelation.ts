import { HubSpotCompany, HubSpotContact, DwollaCustomer, DwollaTransfer } from '../types'
import { logger } from './logger'

export interface CorrelatedCustomerData {
  hubspot: {
    company?: HubSpotCompany
    contacts: HubSpotContact[]
  }
  dwolla: {
    customer?: DwollaCustomer
    transfers: DwollaTransfer[]
  }
  correlation: {
    isLinked: boolean
    linkType: 'dwolla_id' | 'email' | 'name_match' | 'none'
    confidence: number
    inconsistencies: DataInconsistency[]
  }
}

export interface DataInconsistency {
  field: string
  hubspotValue: any
  dwollaValue: any
  severity: 'warning' | 'error'
  message: string
}

/**
 * Correlates HubSpot and Dwolla data to create unified customer profiles
 */
export class DataCorrelationService {
  /**
   * Main correlation method that attempts to link HubSpot and Dwolla data
   */
  correlateSearchResults(
    hubspotCompanies: HubSpotCompany[],
    hubspotContacts: HubSpotContact[],
    dwollaCustomers: DwollaCustomer[],
    dwollaTransfers: DwollaTransfer[] = []
  ): CorrelatedCustomerData[] {
    const correlatedData: CorrelatedCustomerData[] = []
    const processedDwollaIds = new Set<string>()

    // First pass: Match by dwolla_id (highest confidence)
    hubspotCompanies.forEach(company => {
      if (company.properties.dwolla_id) {
        const dwollaCustomer = dwollaCustomers.find(
          customer => customer.id === company.properties.dwolla_id
        )

        if (dwollaCustomer) {
          processedDwollaIds.add(dwollaCustomer.id)
          
          const inconsistencies = this.findInconsistencies(company, dwollaCustomer)
          const companyContacts = this.findRelatedContacts(company, hubspotContacts)

          correlatedData.push({
            hubspot: {
              company,
              contacts: companyContacts
            },
            dwolla: {
              customer: dwollaCustomer,
              transfers: dwollaTransfers.filter(t => 
                t.source.id === dwollaCustomer.id || 
                t.destination.id === dwollaCustomer.id
              )
            },
            correlation: {
              isLinked: true,
              linkType: 'dwolla_id',
              confidence: 100,
              inconsistencies
            }
          })

          logger.info('Correlated by dwolla_id', {
            hubspotCompany: company.properties.name,
            dwollaCustomer: dwollaCustomer.businessName || `${dwollaCustomer.firstName} ${dwollaCustomer.lastName}`,
            dwollaId: company.properties.dwolla_id
          })
        }
      }
    })

    // Second pass: Match by email (medium confidence)
    hubspotContacts.forEach(contact => {
      if (contact.properties.email) {
        const dwollaCustomer = dwollaCustomers.find(
          customer => 
            customer.email.toLowerCase() === contact.properties.email.toLowerCase() &&
            !processedDwollaIds.has(customer.id)
        )

        if (dwollaCustomer) {
          processedDwollaIds.add(dwollaCustomer.id)
          
          const relatedCompany = this.findRelatedCompany(contact, hubspotCompanies)
          const inconsistencies = this.findContactInconsistencies(contact, dwollaCustomer, relatedCompany)

          correlatedData.push({
            hubspot: {
              company: relatedCompany,
              contacts: [contact]
            },
            dwolla: {
              customer: dwollaCustomer,
              transfers: dwollaTransfers.filter(t => 
                t.source.id === dwollaCustomer.id || 
                t.destination.id === dwollaCustomer.id
              )
            },
            correlation: {
              isLinked: true,
              linkType: 'email',
              confidence: 85,
              inconsistencies
            }
          })

          logger.info('Correlated by email', {
            email: contact.properties.email,
            dwollaCustomer: dwollaCustomer.businessName || `${dwollaCustomer.firstName} ${dwollaCustomer.lastName}`
          })
        }
      }
    })

    // Third pass: Fuzzy name matching (lower confidence)
    hubspotCompanies.forEach(company => {
      if (!company.properties.dwolla_id) {
        dwollaCustomers
          .filter(customer => !processedDwollaIds.has(customer.id))
          .forEach(customer => {
            const similarity = this.calculateNameSimilarity(
              company.properties.name,
              customer.businessName || ''
            )

            if (similarity > 0.8) {
              processedDwollaIds.add(customer.id)
              
              const companyContacts = this.findRelatedContacts(company, hubspotContacts)
              const inconsistencies = this.findInconsistencies(company, customer)
              inconsistencies.push({
                field: 'dwolla_id',
                hubspotValue: null,
                dwollaValue: customer.id,
                severity: 'warning',
                message: 'HubSpot company missing Dwolla ID - consider linking'
              })

              correlatedData.push({
                hubspot: {
                  company,
                  contacts: companyContacts
                },
                dwolla: {
                  customer,
                  transfers: dwollaTransfers.filter(t => 
                    t.source.id === customer.id || 
                    t.destination.id === customer.id
                  )
                },
                correlation: {
                  isLinked: true,
                  linkType: 'name_match',
                  confidence: Math.round(similarity * 100),
                  inconsistencies
                }
              })

              logger.info('Correlated by name similarity', {
                hubspotCompany: company.properties.name,
                dwollaCustomer: customer.businessName,
                similarity: Math.round(similarity * 100)
              })
            }
          })
      }
    })

    // Add uncorrelated HubSpot data
    hubspotCompanies.forEach(company => {
      const isCorrelated = correlatedData.some(
        data => data.hubspot.company?.id === company.id
      )

      if (!isCorrelated) {
        const companyContacts = this.findRelatedContacts(company, hubspotContacts)
        
        correlatedData.push({
          hubspot: {
            company,
            contacts: companyContacts
          },
          dwolla: {
            customer: undefined,
            transfers: []
          },
          correlation: {
            isLinked: false,
            linkType: 'none',
            confidence: 0,
            inconsistencies: []
          }
        })
      }
    })

    // Add uncorrelated Dwolla data
    dwollaCustomers.forEach(customer => {
      if (!processedDwollaIds.has(customer.id)) {
        correlatedData.push({
          hubspot: {
            company: undefined,
            contacts: []
          },
          dwolla: {
            customer,
            transfers: dwollaTransfers.filter(t => 
              t.source.id === customer.id || 
              t.destination.id === customer.id
            )
          },
          correlation: {
            isLinked: false,
            linkType: 'none',
            confidence: 0,
            inconsistencies: []
          }
        })
      }
    })

    // Add orphaned contacts
    hubspotContacts.forEach(contact => {
      const isCorrelated = correlatedData.some(
        data => data.hubspot.contacts.some(c => c.id === contact.id)
      )

      if (!isCorrelated) {
        correlatedData.push({
          hubspot: {
            company: undefined,
            contacts: [contact]
          },
          dwolla: {
            customer: undefined,
            transfers: []
          },
          correlation: {
            isLinked: false,
            linkType: 'none',
            confidence: 0,
            inconsistencies: []
          }
        })
      }
    })

    return correlatedData
  }

  /**
   * Find data inconsistencies between HubSpot and Dwolla
   */
  private findInconsistencies(
    company: HubSpotCompany,
    customer: DwollaCustomer
  ): DataInconsistency[] {
    const inconsistencies: DataInconsistency[] = []

    // Check business name match
    if (customer.businessName && company.properties.name) {
      const nameSimilarity = this.calculateNameSimilarity(
        company.properties.name,
        customer.businessName
      )
      
      if (nameSimilarity < 0.9 && nameSimilarity > 0.5) {
        inconsistencies.push({
          field: 'businessName',
          hubspotValue: company.properties.name,
          dwollaValue: customer.businessName,
          severity: 'warning',
          message: 'Business names are similar but not identical'
        })
      }
    }

    // Check status consistency
    if (company.properties.onboarding_status && customer.status) {
      const statusMap: Record<string, string> = {
        'verified': 'complete',
        'unverified': 'in_progress',
        'suspended': 'blocked'
      }

      const mappedDwollaStatus = statusMap[customer.status] || customer.status
      
      if (company.properties.onboarding_status !== mappedDwollaStatus) {
        inconsistencies.push({
          field: 'status',
          hubspotValue: company.properties.onboarding_status,
          dwollaValue: customer.status,
          severity: customer.status === 'suspended' ? 'error' : 'warning',
          message: `Status mismatch: HubSpot shows "${company.properties.onboarding_status}", Dwolla shows "${customer.status}"`
        })
      }
    }

    return inconsistencies
  }

  /**
   * Find inconsistencies for contact-based matches
   */
  private findContactInconsistencies(
    contact: HubSpotContact,
    customer: DwollaCustomer,
    company?: HubSpotCompany
  ): DataInconsistency[] {
    const inconsistencies: DataInconsistency[] = []

    // Check name consistency
    if (customer.type === 'personal') {
      const hubspotFullName = `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim()
      const dwollaFullName = `${customer.firstName} ${customer.lastName}`.trim()

      if (hubspotFullName && dwollaFullName && hubspotFullName !== dwollaFullName) {
        inconsistencies.push({
          field: 'name',
          hubspotValue: hubspotFullName,
          dwollaValue: dwollaFullName,
          severity: 'warning',
          message: 'Names don\'t match exactly'
        })
      }
    }

    // Check if company should have dwolla_id
    if (company && !company.properties.dwolla_id && customer.id) {
      inconsistencies.push({
        field: 'dwolla_id',
        hubspotValue: null,
        dwollaValue: customer.id,
        severity: 'warning',
        message: 'HubSpot company missing Dwolla ID - consider updating'
      })
    }

    return inconsistencies
  }

  /**
   * Calculate similarity between two names (0-1)
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0

    // Normalize names
    const norm1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '')
    const norm2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '')

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(norm1, norm2)
    const maxLength = Math.max(norm1.length, norm2.length)
    
    return 1 - (distance / maxLength)
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Find contacts related to a company
   */
  private findRelatedContacts(
    company: HubSpotCompany,
    contacts: HubSpotContact[]
  ): HubSpotContact[] {
    return contacts.filter(contact => 
      contact.properties.company?.toLowerCase() === company.properties.name?.toLowerCase()
    )
  }

  /**
   * Find company related to a contact
   */
  private findRelatedCompany(
    contact: HubSpotContact,
    companies: HubSpotCompany[]
  ): HubSpotCompany | undefined {
    if (!contact.properties.company) return undefined

    return companies.find(company => 
      company.properties.name?.toLowerCase() === contact.properties.company?.toLowerCase()
    )
  }
}

// Export singleton instance
export const dataCorrelationService = new DataCorrelationService()