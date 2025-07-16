// Direct search implementation that runs in the popup
// Bypasses service worker to avoid timeout issues

import { logger } from './logger'
import { getAccessToken } from './auth'
import { EnhancedHubSpotClient, EnhancedDwollaClient } from './apiEnhanced'
import { dataCorrelationService } from './dataCorrelation'
import { detectAndValidateQueryType } from './validation'

export async function performDirectSearch(query: string) {
  const timer = logger.startTimer('direct_search')
  
  try {
    logger.info('Starting direct search', { query })
    
    // Check authentication
    const [hubspotToken, dwollaToken] = await Promise.all([
      getAccessToken('hubspot'),
      getAccessToken('dwolla')
    ])
    
    if (!hubspotToken) {
      throw new Error('Not authenticated with HubSpot')
    }
    
    // Create API clients
    const hubspotClient = new EnhancedHubSpotClient()
    const dwollaClient = new EnhancedDwollaClient()
    
    // Detect query type
    const queryInfo = detectAndValidateQueryType(query)
    const queryType = queryInfo.type
    
    // Perform searches in parallel
    const [hubspotResults, dwollaResults] = await Promise.all([
      searchHubSpot(hubspotClient, query, queryType as string),
      searchDwolla(dwollaClient, query, queryType as string)
    ])
    
    // Correlate results
    const correlatedData = dataCorrelationService.correlateSearchResults(
      hubspotResults.companies,
      hubspotResults.contacts,
      dwollaResults.customers,
      []
    )
    
    // Calculate summary
    const summary = {
      totalResults: correlatedData.length,
      linkedAccounts: correlatedData.filter(d => d.correlation.isLinked).length,
      unlinkedHubSpot: correlatedData.filter(d => d.hubspot.company && !d.dwolla.customer).length,
      unlinkedDwolla: correlatedData.filter(d => !d.hubspot.company && d.dwolla.customer).length,
      inconsistencyCount: correlatedData.reduce((count, d) => count + d.correlation.inconsistencies.length, 0)
    }
    
    const duration = timer.end()
    logger.info('Direct search completed', { duration, resultCount: correlatedData.length })
    
    return {
      success: true,
      correlatedData,
      summary
    }
  } catch (error) {
    const duration = timer.end()
    logger.error('Direct search failed', error as Error, { duration })
    throw error
  }
}

async function searchHubSpot(client: EnhancedHubSpotClient, query: string, queryType: string) {
  try {
    if (queryType === 'email') {
      const response = await client.searchContacts(query)
      return {
        contacts: response.results || [],
        companies: []
      }
    } else {
      const results = await client.searchByName(query)
      return {
        contacts: results.contacts || [],
        companies: results.companies || []
      }
    }
  } catch (error) {
    logger.error('HubSpot search error', error as Error)
    return { contacts: [], companies: [] }
  }
}

async function searchDwolla(client: EnhancedDwollaClient, query: string, queryType: string) {
  try {
    let response
    if (queryType === 'email') {
      response = await client.searchCustomers(query)
    } else {
      response = await client.searchCustomersByName(query)
    }
    
    return {
      customers: response._embedded?.customers || [],
      transfers: []
    }
  } catch (error) {
    logger.error('Dwolla search error', error as Error)
    return { customers: [], transfers: [] }
  }
}