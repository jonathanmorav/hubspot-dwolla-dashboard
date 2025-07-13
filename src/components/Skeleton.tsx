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