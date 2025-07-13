import React from 'react'
import { HubSpotCompany, HubSpotContact } from '../types'
import { SkeletonCustomer } from './Skeleton'
import { EmptyState } from './EmptyState'
import './Panel.css'

interface HubSpotPanelProps {
  companies: HubSpotCompany[]
  contacts: HubSpotContact[]
  loading?: boolean
  error?: string | null
}

function HubSpotPanelComponent({ companies, contacts, loading, error }: HubSpotPanelProps) {
  if (loading) {
    return (
      <div className="panel hubspot-panel" role="region" aria-labelledby="hubspot-heading">
        <h2 id="hubspot-heading">HubSpot Data</h2>
        <div className="panel-content">
          <div role="status" aria-live="polite" aria-label="Loading HubSpot data">
            <div className="data-section">
              <h3>Contacts</h3>
              <SkeletonCustomer />
              <SkeletonCustomer />
            </div>
            <div className="data-section">
              <h3>Companies</h3>
              <SkeletonCustomer />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel hubspot-panel" role="region" aria-labelledby="hubspot-heading">
        <h2 id="hubspot-heading">HubSpot Data</h2>
        <div className="panel-content">
          <div className="error" role="alert">{error}</div>
        </div>
      </div>
    )
  }

  const hasData = companies.length > 0 || contacts.length > 0

  return (
    <div className="panel hubspot-panel" role="region" aria-labelledby="hubspot-heading">
      <h2 id="hubspot-heading">HubSpot Data</h2>
      <div className="panel-content">
        {!hasData ? (
          <EmptyState 
            title="No HubSpot data found"
            description="Search for a customer by email, name, or business name to view their HubSpot information"
          />
        ) : (
          <>
            {contacts.length > 0 && (
              <div className="data-section">
                <h3>Contacts ({contacts.length})</h3>
                <div role="list" aria-label="HubSpot contacts">
                {contacts.map(contact => (
                  <div key={contact.id} className="data-item" role="listitem">
                    <div className="data-row">
                      <span className="label">Name:</span>
                      <span className="value">
                        {contact.properties.firstname} {contact.properties.lastname}
                      </span>
                    </div>
                    <div className="data-row">
                      <span className="label">Email:</span>
                      <span className="value">{contact.properties.email}</span>
                    </div>
                    {contact.properties.phone && (
                      <div className="data-row">
                        <span className="label">Phone:</span>
                        <span className="value">{contact.properties.phone}</span>
                      </div>
                    )}
                  </div>
                ))}
                </div>
              </div>
            )}

            {companies.length > 0 && (
              <div className="data-section">
                <h3>Companies ({companies.length})</h3>
                <div role="list" aria-label="HubSpot companies">
                {companies.map(company => (
                  <div key={company.id} className="data-item" role="listitem">
                    <div className="data-row">
                      <span className="label">Company:</span>
                      <span className="value">{company.properties.name}</span>
                    </div>
                    {company.properties.dwolla_id && (
                      <div className="data-row">
                        <span className="label">Dwolla ID:</span>
                        <span className="value highlight">{company.properties.dwolla_id}</span>
                      </div>
                    )}
                    {company.properties.onboarding_status && (
                      <div className="data-row">
                        <span className="label">Onboarding:</span>
                        <span className={`value status-${company.properties.onboarding_status.toLowerCase()}`}>
                          {company.properties.onboarding_status}
                        </span>
                      </div>
                    )}
                    {company.properties.sob && (
                      <div className="data-row">
                        <span className="label">SOB:</span>
                        <span className="value">{company.properties.sob}</span>
                      </div>
                    )}
                  </div>
                ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export const HubSpotPanel = React.memo(HubSpotPanelComponent)