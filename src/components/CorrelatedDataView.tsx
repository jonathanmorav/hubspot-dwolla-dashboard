import React from 'react'
import { CorrelatedCustomerData } from '../utils/dataCorrelation'
import { QuickActions } from './QuickActions'
import './CorrelatedDataView.css'

interface CorrelatedDataViewProps {
  data: CorrelatedCustomerData
  onSelectCustomer?: (customerId: string) => void
  loading?: boolean
}

export const CorrelatedDataView: React.FC<CorrelatedDataViewProps> = ({
  data,
  onSelectCustomer,
  loading = false
}) => {
  const { hubspot, dwolla, correlation } = data
  
  // Determine the display name
  const displayName = hubspot.company?.properties.name || 
    dwolla.customer?.businessName ||
    (dwolla.customer ? `${dwolla.customer.firstName} ${dwolla.customer.lastName}` : '') ||
    (hubspot.contacts[0] ? `${hubspot.contacts[0].properties.firstname} ${hubspot.contacts[0].properties.lastname}` : '')

  const getLinkIcon = () => {
    switch (correlation.linkType) {
      case 'dwolla_id':
        return '🔗'
      case 'email':
        return '📧'
      case 'name_match':
        return '👥'
      default:
        return ''
    }
  }

  const getConfidenceBadge = () => {
    if (!correlation.isLinked) return null
    
    const { confidence } = correlation
    let className = 'confidence-badge'
    if (confidence === 100) className += ' perfect'
    else if (confidence >= 85) className += ' high'
    else if (confidence >= 70) className += ' medium'
    else className += ' low'
    
    return (
      <span className={className}>
        {confidence}% match {getLinkIcon()}
      </span>
    )
  }

  return (
    <div className={`correlated-data-view ${correlation.isLinked ? 'linked' : 'unlinked'}`}>
      <div className="correlation-header">
        <h3 className="customer-name">{displayName || 'Unknown Customer'}</h3>
        {getConfidenceBadge()}
      </div>
      
      <div className="data-panels">
        {/* HubSpot Panel */}
        <div className={`data-panel hubspot-panel ${hubspot.company || hubspot.contacts.length > 0 ? 'has-data' : 'no-data'}`}>
          <h4>HubSpot</h4>
          
          {hubspot.company && (
            <div className="company-data">
              <div className="data-field">
                <span className="label">Company:</span>
                <span className="value">{hubspot.company.properties.name}</span>
              </div>
              {hubspot.company.properties.dwolla_id && (
                <div className="data-field">
                  <span className="label">Dwolla ID:</span>
                  <span className="value linked-id">{hubspot.company.properties.dwolla_id}</span>
                </div>
              )}
              {hubspot.company.properties.onboarding_status && (
                <div className="data-field">
                  <span className="label">Status:</span>
                  <span className={`value status-${hubspot.company.properties.onboarding_status}`}>
                    {hubspot.company.properties.onboarding_status}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {hubspot.contacts.length > 0 && (
            <div className="contacts-data">
              <h5>Contacts ({hubspot.contacts.length})</h5>
              {hubspot.contacts.map(contact => (
                <div key={contact.id} className="contact-item">
                  <div className="contact-name">
                    {contact.properties.firstname} {contact.properties.lastname}
                  </div>
                  <div className="contact-email">{contact.properties.email}</div>
                </div>
              ))}
            </div>
          )}
          
          {!hubspot.company && hubspot.contacts.length === 0 && (
            <div className="no-data-message">No HubSpot data found</div>
          )}
        </div>

        {/* Connection Indicator */}
        <div className="connection-indicator">
          {correlation.isLinked ? (
            <div className="connection-line linked">
              <span className="link-icon">{getLinkIcon()}</span>
            </div>
          ) : (
            <div className="connection-line unlinked">
              <span className="link-icon">❌</span>
            </div>
          )}
        </div>

        {/* Dwolla Panel */}
        <div className={`data-panel dwolla-panel ${dwolla.customer ? 'has-data' : 'no-data'}`}>
          <h4>Dwolla</h4>
          
          {dwolla.customer && (
            <div 
              className="customer-data clickable"
              onClick={() => onSelectCustomer?.(dwolla.customer!.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectCustomer?.(dwolla.customer!.id)}
              tabIndex={0}
              role="button"
              aria-label={`Select ${dwolla.customer.businessName || `${dwolla.customer.firstName} ${dwolla.customer.lastName}`}`}
            >
              <div className="data-field">
                <span className="label">Name:</span>
                <span className="value">
                  {dwolla.customer.businessName || `${dwolla.customer.firstName} ${dwolla.customer.lastName}`}
                </span>
              </div>
              <div className="data-field">
                <span className="label">Email:</span>
                <span className="value">{dwolla.customer.email}</span>
              </div>
              <div className="data-field">
                <span className="label">Type:</span>
                <span className="value">{dwolla.customer.type}</span>
              </div>
              <div className="data-field">
                <span className="label">Status:</span>
                <span className={`value status-${dwolla.customer.status}`}>
                  {dwolla.customer.status}
                </span>
              </div>
              {dwolla.transfers.length > 0 && (
                <div className="transfer-summary">
                  {dwolla.transfers.length} recent transfer{dwolla.transfers.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
          
          {!dwolla.customer && (
            <div className="no-data-message">No Dwolla data found</div>
          )}
        </div>
      </div>

      {/* Inconsistencies Warning */}
      {correlation.inconsistencies.length > 0 && (
        <div className="inconsistencies-panel">
          <h5>⚠️ Data Inconsistencies</h5>
          {correlation.inconsistencies.map((inconsistency, index) => (
            <div key={index} className={`inconsistency-item ${inconsistency.severity}`}>
              <span className="inconsistency-icon">
                {inconsistency.severity === 'error' ? '❌' : '⚠️'}
              </span>
              <span className="inconsistency-message">{inconsistency.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {!correlation.isLinked && hubspot.company && dwolla.customer && (
        <div className="suggestion-panel">
          <span className="suggestion-icon">💡</span>
          <span className="suggestion-text">
            These accounts might be related. Consider linking them by adding Dwolla ID to HubSpot.
          </span>
        </div>
      )}

      {/* Quick Actions */}
      <QuickActions 
        data={data}
        onActionComplete={(action, success) => {
          if (success) {
            console.log(`Action ${action} completed successfully`)
          }
        }}
      />
    </div>
  )
}