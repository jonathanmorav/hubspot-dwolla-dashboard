import React from 'react'
import { DwollaCustomer, DwollaTransfer } from '../types'
import { SkeletonCustomer, SkeletonTransfer } from './Skeleton'
import { EmptyState } from './EmptyState'
import './Panel.css'

interface DwollaPanelProps {
  customers: DwollaCustomer[]
  transfers: DwollaTransfer[]
  loading?: boolean
  error?: string | null
  onSelectCustomer?: (customerId: string) => void
}

function DwollaPanelComponent({ 
  customers, 
  transfers, 
  loading, 
  error, 
  onSelectCustomer 
}: DwollaPanelProps) {
  if (loading) {
    return (
      <div className="panel dwolla-panel" role="region" aria-labelledby="dwolla-heading">
        <h2 id="dwolla-heading">Dwolla Data</h2>
        <div className="panel-content">
          <div role="status" aria-live="polite" aria-label="Loading Dwolla data">
            <div className="data-section">
              <h3>Customers</h3>
              <SkeletonCustomer />
              <SkeletonCustomer />
            </div>
            {transfers.length > 0 && (
              <div className="data-section">
                <h3>Recent Transfers</h3>
                <SkeletonTransfer />
                <SkeletonTransfer />
                <SkeletonTransfer />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel dwolla-panel" role="region" aria-labelledby="dwolla-heading">
        <h2 id="dwolla-heading">Dwolla Data</h2>
        <div className="panel-content">
          <div className="error" role="alert">{error}</div>
        </div>
      </div>
    )
  }

  const hasData = customers.length > 0

  return (
    <div className="panel dwolla-panel" role="region" aria-labelledby="dwolla-heading">
      <h2 id="dwolla-heading">Dwolla Data</h2>
      <div className="panel-content">
        {!hasData ? (
          <EmptyState 
            title="No Dwolla data found"
            description="Search for a customer to view their Dwolla account and transfer history"
          />
        ) : (
          <>
            <div className="data-section">
              <h3>Customers ({customers.length})</h3>
              <div role="list" aria-label="Dwolla customers">
              {customers.map(customer => (
                <div 
                  key={customer.id} 
                  className="data-item clickable" 
                  onClick={() => onSelectCustomer?.(customer.id)}
                  onKeyDown={(e) => e.key === 'Enter' && onSelectCustomer?.(customer.id)}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`Customer: ${customer.businessName || `${customer.firstName} ${customer.lastName}`}`}
                >
                  <div className="data-row">
                    <span className="label">Name:</span>
                    <span className="value">
                      {customer.businessName || `${customer.firstName} ${customer.lastName}`}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="label">Email:</span>
                    <span className="value">{customer.email}</span>
                  </div>
                  <div className="data-row">
                    <span className="label">Type:</span>
                    <span className="value">{customer.type}</span>
                  </div>
                  <div className="data-row">
                    <span className="label">Status:</span>
                    <span className={`value status-${customer.status}`}>
                      {customer.status}
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="label">Created:</span>
                    <span className="value">{new Date(customer.created).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              </div>
            </div>

            {transfers.length > 0 && (
              <div className="data-section">
                <h3>Recent Transfers ({transfers.length})</h3>
                <div className="transfers-list" role="list" aria-label="Recent transfers">
                  {transfers.map(transfer => (
                    <div key={transfer.id} className="transfer-item" role="listitem">
                      <div className="transfer-header">
                        <span className="transfer-amount">${transfer.amount.value}</span>
                        <span className={`transfer-status status-${transfer.status}`}>
                          {transfer.status}
                        </span>
                      </div>
                      <div className="transfer-date">
                        {new Date(transfer.created).toLocaleString()}
                      </div>
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

export const DwollaPanel = React.memo(DwollaPanelComponent)