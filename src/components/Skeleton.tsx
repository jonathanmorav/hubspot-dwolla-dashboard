import './Skeleton.css'

interface SkeletonProps {
  width?: string
  height?: string
  className?: string
}

export function Skeleton({ width = '100%', height = '20px', className = '' }: SkeletonProps) {
  return (
    <div 
      className={`skeleton ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

export function SkeletonCustomer() {
  return (
    <div className="skeleton-customer">
      <div className="skeleton-row">
        <Skeleton width="60px" height="16px" />
        <Skeleton width="150px" height="16px" />
      </div>
      <div className="skeleton-row">
        <Skeleton width="60px" height="16px" />
        <Skeleton width="200px" height="16px" />
      </div>
      <div className="skeleton-row">
        <Skeleton width="60px" height="16px" />
        <Skeleton width="80px" height="16px" />
      </div>
    </div>
  )
}

export function SkeletonTransfer() {
  return (
    <div className="skeleton-transfer">
      <div className="skeleton-header">
        <Skeleton width="80px" height="20px" />
        <Skeleton width="70px" height="24px" />
      </div>
      <Skeleton width="140px" height="14px" />
    </div>
  )
}

export function SkeletonCorrelatedData() {
  return (
    <div className="skeleton-correlated-data">
      {/* Header */}
      <div className="skeleton-correlation-header">
        <Skeleton width="200px" height="22px" />
        <Skeleton width="80px" height="26px" />
      </div>
      
      {/* Data panels */}
      <div className="skeleton-data-panels">
        {/* HubSpot panel */}
        <div className="skeleton-data-panel">
          <Skeleton width="80px" height="18px" className="skeleton-panel-title" />
          <div className="skeleton-panel-content">
            <div className="skeleton-field">
              <Skeleton width="60px" height="12px" />
              <Skeleton width="150px" height="16px" />
            </div>
            <div className="skeleton-field">
              <Skeleton width="70px" height="12px" />
              <Skeleton width="120px" height="16px" />
            </div>
            <div className="skeleton-field">
              <Skeleton width="50px" height="12px" />
              <Skeleton width="90px" height="16px" />
            </div>
          </div>
        </div>
        
        {/* Connection indicator */}
        <div className="skeleton-connection">
          <Skeleton width="40px" height="20px" />
        </div>
        
        {/* Dwolla panel */}
        <div className="skeleton-data-panel">
          <Skeleton width="60px" height="18px" className="skeleton-panel-title" />
          <div className="skeleton-panel-content">
            <div className="skeleton-field">
              <Skeleton width="40px" height="12px" />
              <Skeleton width="180px" height="16px" />
            </div>
            <div className="skeleton-field">
              <Skeleton width="50px" height="12px" />
              <Skeleton width="140px" height="16px" />
            </div>
            <div className="skeleton-field">
              <Skeleton width="40px" height="12px" />
              <Skeleton width="70px" height="16px" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick actions skeleton */}
      <div className="skeleton-quick-actions">
        <Skeleton width="120px" height="18px" className="skeleton-actions-title" />
        <div className="skeleton-actions-grid">
          <Skeleton width="100px" height="36px" />
          <Skeleton width="120px" height="36px" />
          <Skeleton width="90px" height="36px" />
          <Skeleton width="110px" height="36px" />
        </div>
      </div>
    </div>
  )
}